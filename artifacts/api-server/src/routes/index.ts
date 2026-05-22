import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import teamRouter from "./team";
import dimensionsRouter from "./dimensions";
import outputsRouter from "./outputs";
import generateRouter from "./generate";
import configRouter from "./config";
import stokRouter from "./stok";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(teamRouter);
router.use(dimensionsRouter);
router.use(outputsRouter);
router.use(generateRouter);
router.use(configRouter);
router.use(stokRouter);

export default router;
