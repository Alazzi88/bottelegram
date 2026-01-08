require("dotenv").config(); // استدعاء مكتبة dotenv للقراءة من ملف .env محلياً
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// 🔴 جلب التوكن من متغيرات البيئة
const token = process.env.BOT_TOKEN;

// التحقق من وجود التوكن لتجنب الأخطاء
if (!token) {
  console.error(
    "❌ خطأ: لم يتم العثور على التوكن! تأكد من إضافته في Environment Variables."
  );
  process.exit(1);
}

// إعداد البوت
const bot = new TelegramBot(token, { polling: true });

// إعداد خادم Express
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running securely! 🔒🚀");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

console.log("تم تفعيل نظام الحماية (Bot Started)... 🛡️");

// --- قائمة الكلمات الممنوعة ---
const badKeywords = [
  "سكليف",
  "سكلفت",
  "اجازه",
  "اجازة",
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
  "نصب",
  "احتيال",
  "هكر",
  "تهكير",
  "اختراق",
  "استرجاع",
  "منحول",
  "تحويل",
  "بنكي",
  "صراف",
  "زواج",
  "مسيار",
  "خطابه",
  "مطلقه",
  "تعارف",
  "خاص",
  "كلمني",
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
  "سكس",
  "اباحي",
  "موجب",
  "سالب",
  "اسستثمر",
];

function stripText(text) {
  if (!text) return "";
  let clean = text;
  clean = clean.replace(/[\u0640\u064B-\u065F\u0670]/g, "");
  clean = clean.replace(/[^\p{L}\p{N}]/gu, "");
  clean = clean.replace(/[أإآا]/g, "ا");
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
    } catch (e) {}
    return;
  }

  const originalText = msg.text || msg.caption;
  if (!originalText) return;

  const strippedText = stripText(originalText);
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
      console.log(`🗑️ Deleted message from: ${msg.from.first_name}`);
    } catch (error) {}
  }
});

bot.on("polling_error", (error) => {
  if (error.code !== "EFATAL") {
  }
});
