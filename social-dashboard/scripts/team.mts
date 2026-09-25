/**
 * Manage who can sign in, from the terminal. The only way to create the first
 * admin — after that, admins can use the Team page in the app.
 *
 *   npm run team -- add "Jess Tran" --admin
 *   npm run team -- add "Sam Lee"
 *   npm run team -- list
 *   npm run team -- reset <id>
 *   npm run team -- revoke <id>
 *
 * Codes are printed once and never stored readable.
 */
import { closeHealthDb } from "../src/lib/db.ts";
import { createPerson, listPeople, resetCode, revokePerson } from "../src/lib/team/people.ts";

const [command, ...rest] = process.argv.slice(2);

function usage(): never {
  console.error('Usage: npm run team -- add "Name" [--admin] | list | reset <id> | revoke <id>');
  process.exit(1);
}

function printCode(name: string, code: string) {
  console.log(`\nAccess code for ${name}:\n\n    ${code}\n\nSend it to them privately. It won't be shown again; use "reset" if it's lost.\n`);
}

try {
  switch (command) {
    case "add": {
      const name = rest.filter((a) => a !== "--admin").join(" ").trim();
      if (!name) usage();
      const { person, code } = createPerson(name, rest.includes("--admin") ? "admin" : "member");
      printCode(`${person.name} (${person.role})`, code);
      break;
    }
    case "list": {
      const people = listPeople();
      if (people.length === 0) console.log('Nobody yet. Add yourself: npm run team -- add "Your Name" --admin');
      for (const p of people) console.log(`${String(p.id).padStart(3)}  ${p.name}  ·  ${p.role}${p.revoked_at ? "  ·  removed" : ""}`);
      break;
    }
    case "reset": {
      const id = Number(rest[0]);
      const person = listPeople().find((p) => p.id === id);
      const code = person ? resetCode(id) : null;
      if (!person || !code) throw new Error(`No active person with id ${rest[0]}. Run "npm run team -- list".`);
      printCode(person.name, code);
      break;
    }
    case "revoke": {
      const id = Number(rest[0]);
      if (!revokePerson(id)) throw new Error(`No active person with id ${rest[0]}. Run "npm run team -- list".`);
      console.log("Access removed. Their comments and history stay.");
      break;
    }
    default:
      usage();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  closeHealthDb();
}
