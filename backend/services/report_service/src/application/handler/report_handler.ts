import { ReportUsecase } from "../usecases/report.js";
import {
  GenerateReportRequest,
  GenerateReportResponse,
  UploadTemplateRequest,
  UploadTemplateResponse,
  DeleteTemplateRequest,
  DeleteTemplateResponse,
  ListTemplatesRequest,
  ListTemplatesResponse,
} from "../../../pb/report.js";
import {
  type ServerUnaryCall,
  type sendUnaryData,
  type ServiceError,
  status,
} from "@grpc/grpc-js";

export class ReportHandler {
  constructor(private readonly reportUsecase: ReportUsecase) { }
  generateReport = async (
    call: ServerUnaryCall<GenerateReportRequest, GenerateReportResponse>,
    callback: sendUnaryData<GenerateReportResponse>,
  ) => {
    try {
      console.log("Incoming request:");
      console.dir(call.request, { depth: null });

      // checking token
      // const accessToken = call.metadata.get("access_token")?.[0]?.toString();
      // if (!accessToken || accessToken !== process.env.WALLET_SERVICE_TOKEN) {
      //   callback(
      //     {
      //       code: status.UNAUTHENTICATED,
      //       message: "invalid token",
      //     } as ServiceError,
      //     null,
      //   );
      //   return;
      // }

      // checking user id in metadata
      // const userId = call.metadata.get("user_id")?.[0]?.toString();
      // if (!userId) {
      //   callback(
      //     {
      //       code: status.UNAUTHENTICATED,
      //       message: "invalid user id",
      //     } as ServiceError,
      //     null,
      //   );
      //   return;
      // }

      const response = await this.reportUsecase.generateReport(call.request);

      console.log("Outgoing response:");
      console.dir(response, { depth: null });

      callback(null, response);
    } catch (err) {
      console.error("gRPC error:", err);

      callback(err as ServiceError, null);
    }
  };

  uploadTemplate = async (
    call: ServerUnaryCall<UploadTemplateRequest, UploadTemplateResponse>,
    callback: sendUnaryData<UploadTemplateResponse>,
  ) => {
    try {
      // const accessToken = call.metadata.get("access_token")?.[0]?.toString();
      // if (!accessToken || accessToken !== process.env.WALLET_SERVICE_TOKEN) {
      //   callback(
      //     {
      //       code: status.UNAUTHENTICATED,
      //       message: "invalid token",
      //     } as ServiceError,
      //     null,
      //   );
      //   return;
      // }

      // checking user id in metadata
      // const userId = call.metadata.get("user_id")?.[0]?.toString();
      // if (!userId) {
      //   callback(
      //     {
      //       code: status.UNAUTHENTICATED,
      //       message: "invalid user id",
      //     } as ServiceError,
      //     null,
      //   );
      //   return;
      // }

      const response = await this.reportUsecase.uploadTemplate(call.request);
      callback(null, response);
    } catch (err) {
      console.error("gRPC error:", err);
      callback(err as ServiceError, null);
    }
  };

  deleteTemplate = async (
    call: ServerUnaryCall<DeleteTemplateRequest, DeleteTemplateResponse>,
    callback: sendUnaryData<DeleteTemplateResponse>,
  ) => {
    try {
      // const accessToken = call.metadata.get("access_token")?.[0]?.toString();
      // if (!accessToken || accessToken !== process.env.WALLET_SERVICE_TOKEN) {
      //   callback(
      //     {
      //       code: status.UNAUTHENTICATED,
      //       message: "invalid token",
      //     } as ServiceError,
      //     null,
      //   );
      //   return;
      // }

      const response = await this.reportUsecase.deleteTemplate(call.request);
      callback(null, response);
    } catch (err) {
      console.error("gRPC error:", err);
      callback(err as ServiceError, null);
    }
  };

  listTemplates = async (
    call: ServerUnaryCall<ListTemplatesRequest, ListTemplatesResponse>,
    callback: sendUnaryData<ListTemplatesResponse>,
  ) => {
    try {
      // const accessToken = call.metadata.get("access_token")?.[0]?.toString();
      // if (!accessToken || accessToken !== process.env.WALLET_SERVICE_TOKEN) {
      //   callback(
      //     {
      //       code: status.UNAUTHENTICATED,
      //       message: "invalid token",
      //     } as ServiceError,
      //     null,
      //   );
      //   return;
      // }

      const response = await this.reportUsecase.listTemplates(call.request);
      callback(null, response);
    } catch (err) {
      console.error("gRPC error:", err);
      callback(err as ServiceError, null);
    }
  };
}
