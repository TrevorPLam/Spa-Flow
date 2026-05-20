import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import clientsRouter from "./clients";
import lockersRouter from "./lockers";
import roomsRouter from "./rooms";
import pricingRouter from "./pricing";
import checkinRouter from "./checkin";
import waitlistRouter from "./waitlist";
import productsRouter from "./products";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import auditRouter from "./audit";
import configRouter from "./config";
import testRouter from "./test";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(lockersRouter);
router.use(roomsRouter);
router.use(pricingRouter);
router.use(checkinRouter);
router.use(waitlistRouter);
router.use(productsRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(auditRouter);
router.use(configRouter);
router.use(testRouter);

export default router;
