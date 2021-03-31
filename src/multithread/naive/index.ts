import { worker } from "cluster";
import { spawn, Pool, Worker, Thread } from "threads";
import * as bls from "../../lib";
import { WorkerApi } from "./worker";

type ThreadType = Thread &
  {
    [K in keyof WorkerApi]: (
      ...args: Parameters<WorkerApi[K]>
    ) => Promise<ReturnType<WorkerApi[K]>>;
  };

export class BlsMultiThreadNaive {
  pool: Pool<ThreadType>;

  constructor(workerCount?: number) {
    this.pool = Pool(
      () => (spawn(new Worker("./worker.js")) as any) as Promise<ThreadType>,
      workerCount
    );
  }

  async destroy() {
    await this.pool.terminate(true);
  }

  async verify(
    msg: Uint8Array,
    pk: bls.PublicKey,
    sig: bls.Signature
  ): Promise<boolean> {
    return this.pool.queue((worker) =>
      worker.verify(msg, pk.serialize(), sig.serialize())
    );
  }

  async verifyMultipleAggregateSignatures(
    msgs: Uint8Array[],
    pks: bls.PublicKey[],
    sigs: bls.Signature[]
  ): Promise<boolean> {
    return this.pool.queue((worker) =>
      worker.verifyMultipleAggregateSignatures(
        msgs,
        pks.map((pk) => pk.serialize()),
        sigs.map((sig) => sig.serialize())
      )
    );
  }
}
