// 안드로이드 APK 빌드 후 프로젝트 폴더에 3D_Omok.apk로 복사
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const run = (cmd, cwd) => execSync(cmd, { stdio: "inherit", cwd });

const JDK = "C:/Program Files/Microsoft/jdk-21.0.13.21-hotspot";
if (!process.env.JAVA_HOME || !fs.existsSync(process.env.JAVA_HOME)) process.env.JAVA_HOME = JDK;
run("node build-single.js");
fs.rmSync("www", { recursive: true, force: true });
fs.mkdirSync("www");
fs.copyFileSync("3D_Omok.html", "www/index.html");
if (!fs.existsSync("android")) run("npx cap add android");
run("npx cap sync android");
const gradlew = path.resolve("android", process.platform === "win32" ? "gradlew.bat" : "gradlew");
run(`"${gradlew}" assembleDebug`, path.resolve("android"));
fs.copyFileSync("android/app/build/outputs/apk/debug/app-debug.apk", "3D_Omok.apk");
console.log("\n완료 => " + path.resolve("3D_Omok.apk"));
