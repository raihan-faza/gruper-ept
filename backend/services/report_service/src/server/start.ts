import { ReportHandler } from "../application/handler/report_handler.js";
import { ReportUsecase } from "../application/usecases/report.js";
import { ReportServiceService } from "../../pb/report.js";
import { ExpenseServiceClient } from "../../pb/expense.js";
import { UserServiceClient } from "../../pb/user.js";
import * as grpc from "@grpc/grpc-js";

export function startServer() {
  const servicePort = process.env.SERVICE_PORT || "3030";
  const expenseServiceHost = process.env.EXPENSE_SERVICE_HOST || "localhost";
  const expenseServicePort = process.env.EXPENSE_SERVICE_PORT || "50053";
  const userServiceHost = process.env.USER_SERVICE_HOST || "localhost";
  const userServicePort = process.env.USER_SERVICE_PORT || "3000";

  const expenseService = new ExpenseServiceClient(
    `${expenseServiceHost}:${expenseServicePort}`,
    grpc.credentials.createInsecure(),
  );

  const userService = new UserServiceClient(
    `${userServiceHost}:${userServicePort}`,
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
    `0.0.0.0:${servicePort}`,
    grpc.ServerCredentials.createInsecure(),
    () => {
      console.log(`Server running at ${servicePort}`);
    },
  );
}

