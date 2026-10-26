import { handle } from 'hono/vercel';
import app from '../packages/server/src/index';

export default handle(app);
