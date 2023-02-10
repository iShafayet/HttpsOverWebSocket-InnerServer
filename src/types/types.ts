import { WebSocket } from "ws";

export type HisWebSocket = {
  uid: string;
  lastReceiveEpoch: number;
} & WebSocket;

export enum HosToHisMessageType {
  ContainsRequestData = "ContainsRequestData",
  WantsMoreResponseData = "WantsMoreResponseData",
  NotifyingEndOfTransmission = "NotifyingEndOfTransmission",
  KeepAlivePing = "KeepAlivePing",
}

export enum HisToHosMessageType {
  WantsMoreRequestData = "WantsMoreRequestData",
  ContainsResponseData = "ContainsResponseData",
  TransmissionError = "TransmissionError",
  KeepAlivePong = "KeepAlivePong",
}

export type HosToHisMessage = {
  uuid: string;
  serial: number;
  type: HosToHisMessageType;

  method: string | null;
  url: string | null;
  headers: Record<string, string> | null;

  body: string | null;
  hasMore: boolean;
};

export type HisToHosMessage = {
  uuid: string;
  serial: number;
  type: HisToHosMessageType;

  statusCode: number | null;
  headers: Record<string, string> | null;

  body: string | null;
  hasMore: boolean;
};
