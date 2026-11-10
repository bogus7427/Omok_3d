// index.html + 모든 JS를 한 파일로 합쳐 3D_Omok.html 생성 (카톡 등으로 전송용)
const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) =>
  "<script>\n" + fs.readFileSync(src, "utf8").replace(/<\/script/gi, "<\/script") + "\n</script>");
html = html.replace(/\s*<link rel="manifest"[^>]*>/, "").replace(/\s*<link rel="apple-touch-icon"[^>]*>/, "")
  .replace(/\s*<script>if \("serviceWorker"[^\n]*<\/script>/, "");
fs.writeFileSync("3D_Omok.html", html);
console.log("3D_Omok.html", (html.length / 1024).toFixed(0) + "KB");
