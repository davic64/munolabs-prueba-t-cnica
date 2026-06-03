import 'dotenv/config';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { userClientAccess, user as userTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const USERS = [
  { name: 'Founder', email: 'founder@muno.lab', password: 'password123', clients: ['acme', 'beta', 'gamma'] },
  { name: 'Lead', email: 'lead@muno.lab', password: 'password123', clients: ['acme'] },
];

async function main() {
  for (const u of USERS) {
    const existing = await db.select().from(userTable).where(eq(userTable.email, u.email));
    let userId: string;
    if (existing.length > 0) {
      userId = existing[0].id;
      console.log(`exists: ${u.email}`);
    } else {
      const res = await auth.api.signUpEmail({ body: { email: u.email, password: u.password, name: u.name } });
      userId = res.user.id;
      console.log(`created: ${u.email}`);
    }
    for (const clientId of u.clients) {
      await db.insert(userClientAccess).values({ userId, clientId }).onConflictDoNothing();
    }
  }
  console.log('seed done');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
