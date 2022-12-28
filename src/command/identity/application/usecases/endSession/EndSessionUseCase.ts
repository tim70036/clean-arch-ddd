import { InternalServerError } from '../../../../../common/CommonError';
import { Transaction } from '../../../../../core/Transaction';
import { Result, ErrOr } from '../../../../../core/Result';
import { DomainEventBus } from '../../../../../core/DomainEvent';
import { EntityId } from '../../../../../core/EntityId';
import { UseCase } from '../../../../../core/UseCase';
import { ISessionRepo } from '../../../domain/repo/ISessionRepo';
import { EndSessionClientWsEvent } from './EndSessionClientWsEvent';
import { identityContainer } from '../../../container';

class EndSessionUseCase extends UseCase<EndSessionClientWsEvent, void> {
    private readonly sessionRepo = identityContainer.resolve<ISessionRepo>('ISessionRepo');

    protected async Run (event: EndSessionClientWsEvent): Promise<ErrOr<void>> {
        const uidOrError = EntityId.CreateFrom(event.uid);
        if (uidOrError.IsFailure())
            return uidOrError;
        const uid: EntityId = uidOrError.Value;

        const trx = await Transaction.Acquire(this.constructor.name);
        try {
            const sessionOrError = await this.sessionRepo.Get(uid);
            if (sessionOrError.IsFailure())
                return sessionOrError;

            const session = sessionOrError.Value;
            session.End();

            await this.sessionRepo.Save(session, trx);
            await trx.Commit();

            DomainEventBus.PublishForAggregate(session);
            return Result.Ok();
        } catch (error) {
            await trx.Rollback();
            return new InternalServerError(`${(error as Error).stack}`);
        }
    }
}

export { EndSessionUseCase };
