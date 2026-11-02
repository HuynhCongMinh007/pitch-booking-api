export abstract class BaseEntity<TProps, TId = number> {
  protected readonly _id?: TId;
  protected readonly props: TProps;

  protected constructor(props: TProps, id?: TId) {
    this._id = id;
    this.props = props;
  }

  get id(): TId | undefined {
    return this._id;
  }

  equals(entity?: BaseEntity<TProps, TId> | null): boolean {
    if (!entity || entity.constructor !== this.constructor) {
      return false;
    }
    if (this === entity) {
      return true;
    }
    if (this._id === undefined || this._id === null) {
      return false;
    }
    return this._id === entity._id;
  }
}
