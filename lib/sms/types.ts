export type SmsSendResult = {
  ok: boolean;
  provider: "smartping";
  status: number;
  transactionId?: string | number;
  state?: string;
  description?: string;
  raw: unknown;
};
