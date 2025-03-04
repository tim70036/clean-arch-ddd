import { AggregateRoot } from "../../../../core/AggregateRoot";
import { EntityId } from "../../../../core/EntityId";
import { Result, ErrOr } from "../../../../core/Result";
import { sign } from "jsonwebtoken";
import dayjs from "dayjs";
import { saferJoi } from "../../../../common/SaferJoi";
import { InvalidDataError } from "../../../../common/CommonError";
import { SessionStartedEvent } from "../event/SessionStartedEvent";
import { SessionEndEvent } from "../event/SessionEndEvent";

interface SessionProps {
  isActive: boolean;
  jwt: string;
  ip: string;
  createTime: dayjs.Dayjs;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
}

class Session extends AggregateRoot<SessionProps> {
  private static readonly schema = saferJoi.object({
    isActive: saferJoi.bool(),
    jwt: saferJoi.string().min(1),
    ip: saferJoi.string().ip().allow(""),
    createTime: saferJoi.object().instance(dayjs),
    startTime: saferJoi.object().instance(dayjs),
    endTime: saferJoi.object().instance(dayjs),
  });

  public static CreateNew(id: EntityId): ErrOr<Session> {
    const jwt = sign({ uid: id.Value }, process.env.JWT_KEY!);
    const session = new Session(
      {
        isActive: false,
        jwt: jwt,
        ip: "",
        createTime: dayjs.utc(),
        startTime: dayjs.utc(),
        endTime: dayjs.utc(),
      },
      id,
    );

    return Result.Ok(session);
  }

  public static CreateFrom(props: SessionProps, id: EntityId): ErrOr<Session> {
    const { error } = Session.schema.validate(props);
    if (error)
      return new InvalidDataError(
        `Failed creating class[${Session.name}] with message[${error.message}]`,
      );

    const session = new Session(props, id);
    return Result.Ok(session);
  }

  public Start(ip: string): ErrOr<void> {
    this.props.isActive = true;
    this.props.ip = ip;
    this.props.startTime = dayjs.utc();

    this.domainEvents.push(new SessionStartedEvent(this.id));
    return Result.Ok();
  }

  public End(): ErrOr<void> {
    this.props.isActive = false;
    this.props.endTime = dayjs.utc();

    this.domainEvents.push(new SessionEndEvent(this.id));
    return Result.Ok();
  }
}
export { Session, SessionProps };
