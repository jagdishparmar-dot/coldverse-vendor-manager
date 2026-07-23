import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "messages", "portal");

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const p = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  const browse = data.common?.browse;
  if (!browse || !data.kyc?.dragDrop) continue;

  let dragDrop = data.kyc.dragDrop;
  if (dragDrop.includes("{browse}")) {
    dragDrop = dragDrop.replace("{browse}", `<browse>${browse}</browse>`);
  } else {
    dragDrop = dragDrop.replace(
      /<browse>[\s\S]*?<\/browse>/,
      `<browse>${browse}</browse>`
    );
  }

  data.kyc.dragDrop = dragDrop;
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`fixed ${file}`);
}
