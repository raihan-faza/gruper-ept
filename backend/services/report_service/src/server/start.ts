import { ReportHandler } from "../application/handler/report_handler.js";
import { ReportUsecase } from "../application/usecases/report.js";
import { ReportServiceService } from "../../pb/report.js";
import { ExpenseServiceClient } from "../../pb/expense.js";
import { UserServiceClient } from "../../pb/user.js";
import * as grpc from "@grpc/grpc-js";

export function startServer() {
  const servicePort = process.env.SERVICE_PORT || "3030";
  const expenseServicePort = process.env.EXPENSE_SERVICE_PORT || "50051";
  const userServicePort = process.env.USER_SERVICE_PORT || "50052";

  const expenseService = new ExpenseServiceClient(
    `localhost:${expenseServicePort}`,
    grpc.credentials.createInsecure(),
  );

  const userService = new UserServiceClient(
    `localhost:${userServicePort}`,
    grpc.credentials.createInsecure(),
  );

  const reportUsecase = new ReportUsecase(expenseService, userService);
  const reportHandler = new ReportHandler(reportUsecase);
  const grpcServer = new grpc.Server();

  grpcServer.addService(ReportServiceService, {
    generateReport: reportHandler.generateReport.bind(reportHandler),
    uploadTemplate: reportHandler.uploadTemplate.bind(reportHandler),
    deleteTemplate: reportHandler.deleteTemplate.bind(reportHandler),
    listTemplates: reportHandler.listTemplates.bind(reportHandler),
  });

  grpcServer.bindAsync(
    `127.0.0.1:${servicePort}`,
    grpc.ServerCredentials.createInsecure(),
    () => {
      console.log(`Server running at ${servicePort}`);
    },
  );
}

