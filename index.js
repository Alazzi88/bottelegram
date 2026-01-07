require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// --- إعداد السيرفر لـ Render ---
const app = express();
app.get("/", (req, res) => {
  res.send("Bot is alive! 🤖");
});

// Render يعطيك منفذ (Port) تلقائي، يجب استخدامه
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// --- إعداد البوت ---
const token = process.env.TELEGRAM_BOT_TOKEN; // سيتم جلبه من إعدادات Render

if (!token) {
  // هذا الخطأ سيظهر في سجلات Render إذا نسيت وضع التوكن
  console.error(
    "❌ Error: TELEGRAM_BOT_TOKEN is missing in Environment Variables!"
  );
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log("تم تشغيل البوت بنجاح... 🛡️");

const badKeywords = [
  // القائمة (بدون همزات)
  "سكليف",
  "سكلفت",
  "اجازه",
  "اجازة",
  "ו𐢋ߺࡋߺع  🇸🇦/ 𐭦ߺݏ࠭ࡉ​​​​​​𐬠 𐢋ߺࡅٜߺ ي",
  "اجازهمرضيه",
  "مرضيه",
  "طبي",
  "طبيات",
  "عذر",
  "اعذار",
  "سكل",
  "تقرير",
  "تقارير",
  "غياب",
  "غيابات",
  "مرافق",
  "صحي",
  "تعديل",
  "مستثمر",
  "يستثمر",
  "استثمار",
  "تداول",
  "ارباح",
  "ربح",
  "فائده",
  "فوائد",
  "محفظه",
  "توصيات",
  "خساره",
  "تعويض",
  "بيتكوين",
  "عملات",
  "فوركس",
  "تشفير",
  "مضمون",
  "مضمونه",
  "دخلتمعشخص",
  "منحول",
  "تحويل",
  "بنكي",
  "صراف",
  "نصب",
  "احتيال",
  "هكر",
  "تهكير",
  "اختراق",
  "استرجاع",
  "زواج",
  "مسيار",
  "خطابه",
  "مطلقه",
  "تعارف",
  "سحر",
  "روحاني",
  "الشيخ",
  "علاج",
  "ادله",
  "اثبات",
  "اثباتات",
  "صوره",
  "اسكرين",
  "واتس",
  "واتساب",
  "تواصل",
  "رقمي",
  "كلمني",
  "خاص",
];

function stripText(text) {
  if (!text) return "";
  let clean = text;
  clean = clean.replace(/[\u0640\u064B-\u065F\u0670]/g, ""); // إزالة التطويل
  clean = clean.replace(/[^\p{L}\p{N}]/gu, ""); // إزالة الرموز
  clean = clean.replace(/[أإآاٱ]/g, "ا"); // توحيد الألف
  clean = clean.replace(/[ةه]/g, "ه");
  clean = clean.replace(/[ىي]/g, "ي");
  clean = clean.replace(/[ؤ]/g, "و");
  clean = clean.replace(/[ئ]/g, "ي");
  clean = clean.replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
  return clean;
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // 1. حذف جهات الاتصال
  if (msg.contact) {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
      return;
    } catch (e) {}
  }

  const originalText = msg.text || msg.caption;
  if (!originalText) return;

  const strippedText = stripText(originalText);

  // 2. كشف الأنماط المخالفة
  const countryCodeRegex = /(\+|00)\d+/;
  const linkRegex =
    /(https?:\/\/)|(www\.)|(\.com|\.net|\.org|\.me)|(t\.me\/)|(@[\w]+)/i;
  const numberRegex = /\d{5,}/;
  const isBadWord = badKeywords.some((k) => strippedText.includes(k));
  const combinedPhrases = ["عندكغياب", "عندكغيابات", "ادلهعلىشخص", "تقريرطبي"];
  const isBadPhrase = combinedPhrases.some((p) => strippedText.includes(p));

  if (
    countryCodeRegex.test(originalText) ||
    linkRegex.test(originalText) ||
    numberRegex.test(strippedText) ||
    isBadWord ||
    isBadPhrase
  ) {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
      console.log(`🗑️ Deleted msg from: ${msg.from.first_name}`);
    } catch (error) {}
  }
});
