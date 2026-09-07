export const QUEUE_INBOUND = 'inbound';
export const QUEUE_INTERPRET = 'interpret';

export interface InboundJob {
  rawMessageId: string;
}

export interface InterpretJob {
  phone: string;
}
