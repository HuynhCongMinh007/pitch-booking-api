import { bearer, createTestApp, randomSuffix, resetTestState, TestContext } from './helpers';

jest.mock('../src/shared/infrastructure/security', () => ({
  ...jest.requireActual('../src/shared/infrastructure/security'),
  generateOtp: () => '135790',
}));

const FIXED_OTP = '135790';
const PASSWORD = 'Password123!';

let ctx: TestContext;
let createdEmails: string[];

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(() => {
  resetTestState(ctx.emailService);
  createdEmails = [];
});

afterEach(async () => {
  // Teams created by these users are deleted by the tests themselves
  await ctx.prisma.team.deleteMany({ where: { creator: { email: { in: createdEmails } } } });
  await ctx.prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});

afterAll(async () => {
  await ctx.app.close();
});

async function createUser(prefix = 'teamuser') {
  const suffix = randomSuffix(8);
  const data = {
    username: `${prefix}_${suffix}`,
    email: `${prefix}_${suffix}@example.com`,
    password: PASSWORD,
  };
  createdEmails.push(data.email);

  await ctx.api().post('/api/v1/auth/send-otp').send({ email: data.email, purpose: 'REGISTER' });
  const res = await ctx
    .api()
    .post('/api/v1/auth/register')
    .send({ ...data, otp: FIXED_OTP });
  expect(res.status).toBe(201);
  const { tokens } = res.body;

  // Fetch user info
  const me = await ctx.api().get('/api/v1/users/me').set(bearer(tokens.access_token));
  expect(me.status).toBe(200);

  return {
    user_id: me.body.id,
    username: data.username,
    email: data.email,
    token: tokens.access_token,
    headers: bearer(tokens.access_token),
  };
}

test('get positions', async () => {
  const res = await ctx.api().get('/api/v1/teams/positions');
  expect(res.status).toBe(200);
  expect(res.body.length).toBeGreaterThanOrEqual(4);
  const codes = res.body.map((p: any) => p.code);
  expect(codes).toEqual(expect.arrayContaining(['GK', 'ST', 'CM']));

  // Filter by PITCH_5
  const res5 = await ctx.api().get('/api/v1/teams/positions?pitch_type=PITCH_5');
  expect(res5.status).toBe(200);
  const codes5 = res5.body.map((p: any) => p.code);
  expect(codes5).toEqual(expect.arrayContaining(['FIXO', 'PIVOT']));
});

test('create team and leader role', async () => {
  const user = await createUser('creator');

  // Get positions to select from
  const positions = (await ctx.api().get('/api/v1/teams/positions')).body;
  const posIds = positions.slice(0, 2).map((p: any) => p.id);

  // Create team
  const teamData = {
    name: `FC Barcelona ${randomSuffix(6)}`,
    description: 'Dream Team',
    my_position_ids: posIds,
  };
  const res = await ctx.api().post('/api/v1/teams/').set(user.headers).send(teamData);
  expect(res.status).toBe(201);
  const team = res.body;
  expect(team.name).toBe(teamData.name);
  expect(team.created_by_id).toBe(user.user_id);
  expect(team.members_count).toBe(1);

  // Get team detail
  const detailRes = await ctx.api().get(`/api/v1/teams/${team.id}`).set(user.headers);
  expect(detailRes.status).toBe(200);
  const detail = detailRes.body;
  expect(detail.my_role).toBe('LEADER');
  expect(detail.members).toHaveLength(1);

  const creatorMember = detail.members[0];
  expect(creatorMember.user_id).toBe(user.user_id);
  expect(creatorMember.role).toBe('LEADER');
  expect(creatorMember.positions).toHaveLength(posIds.length);

  // Cleanup
  await ctx.api().delete(`/api/v1/teams/${team.id}`).set(user.headers);
});

test('member with multiple positions and roles', async () => {
  const leader = await createUser('leader');
  const player1 = await createUser('player1');

  const positionList = (await ctx.api().get('/api/v1/teams/positions')).body;
  const positions = Object.fromEntries(positionList.map((p: any) => [p.code, p.id]));

  // Create team
  const teamRes = await ctx
    .api()
    .post('/api/v1/teams/')
    .set(leader.headers)
    .send({ name: `Hanoi FC ${randomSuffix(6)}` });
  const teamId = teamRes.body.id;

  // Leader adds player1 with multiple titles (e.g. GK and FW)
  const addRes = await ctx
    .api()
    .post(`/api/v1/teams/${teamId}/members`)
    .set(leader.headers)
    .send({ user_id: player1.user_id, role: 'MEMBER', position_ids: [positions.GK, positions.ST] });
  expect(addRes.status).toBe(201);
  const memberData = addRes.body;
  expect(memberData.user_id).toBe(player1.user_id);
  expect(memberData.role).toBe('MEMBER');
  const memberCodes = memberData.positions.map((p: any) => p.code);
  expect(memberCodes).toEqual(expect.arrayContaining(['GK', 'ST']));
  const memberId = memberData.id;

  // Player1 updates their own positions to include CM
  const updatePosRes = await ctx
    .api()
    .put(`/api/v1/teams/${teamId}/members/${memberId}/positions`)
    .set(player1.headers)
    .send({ position_ids: [positions.CM, positions.ST] });
  expect(updatePosRes.status).toBe(200);
  const updatedCodes = updatePosRes.body.positions.map((p: any) => p.code);
  expect(updatedCodes).toContain('CM');
  expect(updatedCodes).not.toContain('GK');

  // Leader promotes player1 to VICE_LEADER
  const roleRes = await ctx
    .api()
    .patch(`/api/v1/teams/${teamId}/members/${memberId}/role`)
    .set(leader.headers)
    .send({ role: 'VICE_LEADER' });
  expect(roleRes.status).toBe(200);
  expect(roleRes.body.role).toBe('VICE_LEADER');

  // Vice leader adds player2
  const player2 = await createUser('player2');
  const addP2Res = await ctx
    .api()
    .post(`/api/v1/teams/${teamId}/members`)
    .set(player1.headers)
    .send({ identifier: player2.username, role: 'MEMBER' });
  expect(addP2Res.status).toBe(201);

  // Vice leader cannot promote anyone or change roles
  const p2Id = addP2Res.body.id;
  const forbiddenRes = await ctx
    .api()
    .patch(`/api/v1/teams/${teamId}/members/${p2Id}/role`)
    .set(player1.headers)
    .send({ role: 'VICE_LEADER' });
  expect(forbiddenRes.status).toBe(403);

  // Leader promotes player2 to TREASURER
  const treasurerRes = await ctx
    .api()
    .patch(`/api/v1/teams/${teamId}/members/${p2Id}/role`)
    .set(leader.headers)
    .send({ role: 'TREASURER' });
  expect(treasurerRes.status).toBe(200);
  expect(treasurerRes.body.role).toBe('TREASURER');

  // Vice leader cannot kick TREASURER
  const cannotKickRes = await ctx
    .api()
    .delete(`/api/v1/teams/${teamId}/members/${p2Id}`)
    .set(player1.headers);
  expect(cannotKickRes.status).toBe(403);

  // Cleanup
  await ctx.api().delete(`/api/v1/teams/${teamId}`).set(leader.headers);
});

test('transfer leadership', async () => {
  const leader = await createUser('lead1');
  const player = await createUser('lead2');

  const teamRes = await ctx
    .api()
    .post('/api/v1/teams/')
    .set(leader.headers)
    .send({ name: `Transfer FC ${randomSuffix(6)}` });
  const teamId = teamRes.body.id;

  const addRes = await ctx
    .api()
    .post(`/api/v1/teams/${teamId}/members`)
    .set(leader.headers)
    .send({ user_id: player.user_id });
  const playerMemberId = addRes.body.id;

  // Leader transfers leadership to player
  const transferRes = await ctx
    .api()
    .patch(`/api/v1/teams/${teamId}/members/${playerMemberId}/role`)
    .set(leader.headers)
    .send({ role: 'LEADER' });
  expect(transferRes.status).toBe(200);
  expect(transferRes.body.role).toBe('LEADER');

  // Check team detail: now player is LEADER and original leader is VICE_LEADER
  const detailRes = await ctx.api().get(`/api/v1/teams/${teamId}`).set(player.headers);
  expect(detailRes.status).toBe(200);
  expect(detailRes.body.my_role).toBe('LEADER');

  const roles = Object.fromEntries(detailRes.body.members.map((m: any) => [m.user_id, m.role]));
  expect(roles[player.user_id]).toBe('LEADER');
  expect(roles[leader.user_id]).toBe('VICE_LEADER');

  // Cleanup: new leader deletes team
  const delRes = await ctx.api().delete(`/api/v1/teams/${teamId}`).set(player.headers);
  expect(delRes.status).toBe(200);
});

test('user can join multiple teams', async () => {
  const user = await createUser('multiteam');
  const otherLead = await createUser('otherlead');

  // User creates Team 1 (as Leader)
  const team1Res = await ctx
    .api()
    .post('/api/v1/teams/')
    .set(user.headers)
    .send({ name: `User Team 1 ${randomSuffix(6)}` });
  const t1Id = team1Res.body.id;

  // Other user creates Team 2, and adds user as Member
  const team2Res = await ctx
    .api()
    .post('/api/v1/teams/')
    .set(otherLead.headers)
    .send({ name: `Other Team 2 ${randomSuffix(6)}` });
  const t2Id = team2Res.body.id;

  await ctx
    .api()
    .post(`/api/v1/teams/${t2Id}/members`)
    .set(otherLead.headers)
    .send({ user_id: user.user_id, role: 'MEMBER' });

  // Check /my-teams for user
  const myTeamsRes = await ctx.api().get('/api/v1/teams/my-teams').set(user.headers);
  expect(myTeamsRes.status).toBe(200);
  const myTeamIds = myTeamsRes.body.map((t: any) => t.id);
  expect(myTeamIds).toContain(t1Id);
  expect(myTeamIds).toContain(t2Id);

  // Cleanup
  await ctx.api().delete(`/api/v1/teams/${t1Id}`).set(user.headers);
  await ctx.api().delete(`/api/v1/teams/${t2Id}`).set(otherLead.headers);
});
