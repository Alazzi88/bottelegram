require("dotenv").config(); // استدعاء مكتبة dotenv للقراءة من ملف .env محلياً
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// --- متغيرات البيئة والإعدادات ---
const token = process.env.BOT_TOKEN;
const ADMIN_PHONE = process.env.ADMIN_PHONE;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// التحقق من المتغيرات الأساسية
if (!token) {
  console.error(
    "❌ خطأ: لم يتم العثور على توكن البوت! تأكد من إضافته في ملف .env.",
  );
  process.exit(1);
}
if (!ADMIN_PHONE) {
  console.error(
    "❌ خطأ: لم يتم العثور على رقم هاتف الأدمن! تأكد من إضافته في ملف .env.",
  );
  process.exit(1);
}
if (!ADMIN_CHAT_ID) {
  console.warn(
    "⚠️ تحذير: لم يتم تحديد ADMIN_CHAT_ID. سيحتاج الأدمن للتحقق عبر رقم الهاتف لمعرفة الـ Chat ID.",
  );
}

// متغيرات الحالة
let adminState = null;
let deletionCount = 0;
let isDeletionEnabled = true;

// إعداد البوت والخادم
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.get("/", (req, res) => res.send("Bot is running securely! 🔒🚀"));
app.listen(process.env.PORT || 3000, () => console.log("Server is running."));

console.log("تم تفعيل نظام الحماية (Bot Started)... 🛡️");

// --- قائمة الكلمات الممنوعة ---
let badKeywords = [
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

// --- الدوال المساعدة ---
function stripText(text) {
  if (!text) return "";
  let clean = text
    .replace(/[\u0640\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
  clean = clean
    .replace(/[أإآا]/g, "ا")
    .replace(/[ةه]/g, "ه")
    .replace(/[ىي]/g, "ي")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي");
  return clean.replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
}

function normalizePhone(phone) {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-9);
}

const isAdmin = (chatId) => chatId.toString() === ADMIN_CHAT_ID;

// --- لوحة تحكم الأدمن ---
const mainAdminMenu = {
  text: "🔐 *لوحة تحكم الأدمن الرئيسية*\n\nأهلاً بك أيها الأدمن! اختر فئة لعرض الخيارات:",
  options: {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 الإحصائيات والحالة", callback_data: "menu_stats" }],
        [{ text: "⚙️ إعدادات الحماية", callback_data: "menu_protection" }],
        [{ text: "ℹ️ معلومات", callback_data: "menu_info" }],
      ],
    },
  },
};

const statsMenu = {
  text: "📊 *الإحصائيات والحالة*",
  options: {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📈 حالة البوت", callback_data: "status_bot" }],
        [{ text: "🔢 عرض عدد المحذوفات", callback_data: "status_deletions" }],
        [{ text: "⬅️ رجوع", callback_data: "menu_main" }],
      ],
    },
  },
};

const protectionMenu = {
  text: "⚙️ *إعدادات الحماية*",
  options: {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📖 عرض الكلمات الممنوعة", callback_data: "list_banned" }],
        [{ text: "➕ إضافة كلمة", callback_data: "add_banned_word" }],
        [{ text: "➖ حذف كلمة", callback_data: "remove_banned_word" }],
        [{ text: "🔄 تفعيل/تعطيل الحذف", callback_data: "toggle_deletion" }],
        [{ text: "⬅️ رجوع", callback_data: "menu_main" }],
      ],
    },
  },
};

const infoMenu = {
  text: "ℹ️ *معلومات*",
  options: {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🆔 جلب ID الدردشة", callback_data: "info_chat_id" }],
        [{ text: "👨‍💻 معلومات المطور", callback_data: "info_dev" }],
        [{ text: "⬅️ رجوع", callback_data: "menu_main" }],
      ],
    },
  },
};

function sendAdminMenu(chatId) {
  bot.sendMessage(chatId, mainAdminMenu.text, mainAdminMenu.options);
}

// --- معالجة الأوامر والرسائل ---

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (isAdmin(chatId)) {
    bot.sendMessage(chatId, "أهلاً بعودتك أيها الأدمن!");
    sendAdminMenu(chatId);
  } else {
    bot.sendMessage(
      chatId,
      "أهلاً بك في البوت.\nللتواصل مع المطور، اضغط على الزر أدناه.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "👨‍💻 التواصل مع المطور", url: "https://t.me/ezzo3zzo3" }],
          ],
        },
      },
    );
  }
});

bot.onText(/\/admin/, (msg) => {
  if (isAdmin(msg.chat.id)) {
    sendAdminMenu(msg.chat.id);
  } else {
    bot.sendMessage(msg.chat.id, "⚠️ هذا الأمر مخصص للأدمن فقط.");
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // آلية التحقق من الهاتف الجديدة (لإيجاد الـ Chat ID)
  if (msg.contact) {
    const receivedPhone = msg.contact.phone_number;
    if (normalizePhone(receivedPhone) === normalizePhone(ADMIN_PHONE)) {
      const discoveredChatId = msg.chat.id;
      bot.sendMessage(
        chatId,
        `✅ أنت مالك البوت!\nمعرف الدردشة (Chat ID) الخاص بك هو: \`${discoveredChatId}\`\n\nالرجاء نسخ هذا الرقم وإضافته إلى ملف \`.env\` كـ \`ADMIN_CHAT_ID=${discoveredChatId}\` ثم أعد تشغيل البوت.`,
        {
          parse_mode: "Markdown",
          reply_markup: { remove_keyboard: true },
        },
      );
    } else {
      bot.sendMessage(chatId, "❌ رقم الهاتف هذا لا يخص مالك البوت.", {
        reply_markup: { remove_keyboard: true },
      });
    }
    return;
  }

  if (isAdmin(chatId) && adminState && text) {
    let word = "";
    switch (adminState) {
      case "awaiting_word_to_add":
        word = stripText(text.trim());
        if (word && !badKeywords.includes(word)) {
          badKeywords.push(word);
          bot.sendMessage(chatId, `✅ تم إضافة الكلمة: *${word}*`, {
            parse_mode: "Markdown",
          });
        } else {
          bot.sendMessage(chatId, `⚠️ الكلمة موجودة بالفعل أو غير صالحة.`);
        }
        break;
      case "awaiting_word_to_remove":
        word = stripText(text.trim());
        const index = badKeywords.indexOf(word);
        if (index > -1) {
          badKeywords.splice(index, 1);
          bot.sendMessage(chatId, `✅ تم حذف الكلمة: *${word}*`, {
            parse_mode: "Markdown",
          });
        } else {
          bot.sendMessage(
            chatId,
            `⚠️ الكلمة "*${word}*" غير موجودة في القائمة.`,
            { parse_mode: "Markdown" },
          );
        }
        break;
    }
    adminState = null;
    sendAdminMenu(chatId); // Show main menu again
    return;
  }

  if ((text && text.startsWith("/")) || !isDeletionEnabled || isAdmin(chatId)) {
    return;
  }

  // --- 1. فحص المنضمين الجدد (حذف رسالة الانضمام إذا كان الاسم ممنوعاً) ---
  if (msg.new_chat_members) {
    for (const member of msg.new_chat_members) {
      const fullName =
        (member.first_name || "") + " " + (member.last_name || "");
      const strippedName = stripText(fullName);
      if (badKeywords.some((k) => strippedName.includes(k))) {
        try {
          await bot.deleteMessage(chatId, msg.message_id);
          deletionCount++;
          console.log(`🗑️ Deleted join message for: ${fullName}`);
        } catch (error) {}
        return;
      }
    }
  }

  const originalText = text || msg.caption;
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
      deletionCount++;
      console.log(
        `🗑️ Deleted message from: ${msg.from.first_name}. Total deletions: ${deletionCount}`,
      );
    } catch (error) {}
  }
});

// --- معالجة أزرار الأدمن ---
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const chatId = msg.chat.id;

  if (!isAdmin(chatId)) {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "⚠️ أنت لست الأدمن!",
    });
    return;
  }

  await bot.answerCallbackQuery(callbackQuery.id);

  switch (data) {
    // قوائم التنقل
    case "menu_main":
      bot.editMessageText(mainAdminMenu.text, {
        chat_id: chatId,
        message_id: msg.message_id,
        ...mainAdminMenu.options,
      });
      break;
    case "menu_stats":
      bot.editMessageText(statsMenu.text, {
        chat_id: chatId,
        message_id: msg.message_id,
        ...statsMenu.options,
      });
      break;
    case "menu_protection":
      bot.editMessageText(protectionMenu.text, {
        chat_id: chatId,
        message_id: msg.message_id,
        ...protectionMenu.options,
      });
      break;
    case "menu_info":
      bot.editMessageText(infoMenu.text, {
        chat_id: chatId,
        message_id: msg.message_id,
        ...infoMenu.options,
      });
      break;

    // خيارات الإحصائيات
    case "status_bot":
      bot.sendMessage(
        chatId,
        "✅ البوت يعمل بشكل طبيعي وجاهز لاستقبال الرسائل.",
      );
      break;
    case "status_deletions":
      bot.sendMessage(
        chatId,
        `🔢 إجمالي الرسائل المحذوفة منذ آخر إعادة تشغيل: *${deletionCount}*`,
        { parse_mode: "Markdown" },
      );
      break;

    // خيارات الحماية
    case "list_banned":
      const keywordsList =
        badKeywords.length > 0
          ? badKeywords.join("\n")
          : "لا توجد كلمات ممنوعة حالياً.";
      bot.sendMessage(
        chatId,
        `📖 *الكلمات الممنوعة حالياً:*\n\n${keywordsList}`,
        { parse_mode: "Markdown" },
      );
      break;
    case "add_banned_word":
      adminState = "awaiting_word_to_add";
      bot.sendMessage(
        chatId,
        "✍️ أرسل الكلمة التي تريد إضافتها إلى القائمة. للإلغاء، أرسل /cancel.",
      );
      break;
    case "remove_banned_word":
      adminState = "awaiting_word_to_remove";
      bot.sendMessage(
        chatId,
        "🗑️ أرسل الكلمة التي تريد حذفها من القائمة. للإلغاء، أرسل /cancel.",
      );
      break;
    case "toggle_deletion":
      isDeletionEnabled = !isDeletionEnabled;
      const status = isDeletionEnabled ? " مفعل" : "معطل";
      bot.sendMessage(
        chatId,
        `✅ تم تحديث حالة الحذف. الحذف الآن *${status}*.`,
      );
      break;

    // خيارات المعلومات
    case "info_chat_id":
      bot.sendMessage(chatId, `🆔 معرف الدردشة الخاص بك هو: \`${chatId}\``, {
        parse_mode: "Markdown",
      });
      break;
    case "info_dev":
      bot.sendMessage(chatId, "👨‍💻 تم تطوير هذا البوت بواسطة ezzo.");
      break;
  }
});

bot.on("polling_error", (error) => {
  if (error.code !== "EFATAL") {
    console.error("Polling error:", error.message);
  }
});
