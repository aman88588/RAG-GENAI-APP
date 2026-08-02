const PDFDocument = require("pdfkit");

// ── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
    primary: "#1A1A2E",
    accent: "#E94560",
    sectionBg: "#F4F6F9",
    text: "#2D2D2D",
    muted: "#6B7280",
    white: "#FFFFFF",
    border: "#E5E7EB",
    hot: "#DC2626",
    warm: "#D97706",
    cold: "#2563EB",
};

const FONTS = {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    oblique: "Helvetica-Oblique",
};

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595; // A4
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

const leadColor = (classification) => {
    if (!classification) return COLORS.muted;
    switch (classification.toLowerCase()) {
        case "hot":  return COLORS.hot;
        case "warm": return COLORS.warm;
        case "cold": return COLORS.cold;
        default:     return COLORS.muted;
    }
};

const safeStr = (val, fallback = "N/A") =>
    val && String(val).trim() ? String(val).trim() : fallback;

const safeArr = (val) =>
    Array.isArray(val) && val.length > 0 ? val : null;

/**
 * Draws a full-width colored header band.
 */
function drawHeader(doc, callData) {
    // Background band
    doc.rect(0, 0, PAGE_WIDTH, 120)
        .fill(COLORS.primary);

    // Title
    doc.font(FONTS.bold)
        .fontSize(22)
        .fillColor(COLORS.white)
        .text("Call Analysis Report", PAGE_MARGIN, 30, { width: CONTENT_WIDTH });

    // Subtitle
    doc.font(FONTS.regular)
        .fontSize(10)
        .fillColor("#A0A8C0")
        .text(`File: ${safeStr(callData.original_name)}  •  UUID: ${safeStr(callData.analysis_uuid)}`, PAGE_MARGIN, 60);

    const date = callData.createdAt
        ? new Date(callData.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : "N/A";
    doc.text(`Analysed: ${date}  •  Processing: ${callData.processing_ms ? callData.processing_ms + " ms" : "N/A"}`, PAGE_MARGIN, 76);

    // Accent bar
    doc.rect(0, 110, PAGE_WIDTH, 4).fill(COLORS.accent);

    doc.moveDown(0.5);
}

/**
 * Draws a section heading.
 */
function sectionHeading(doc, title) {
    const y = doc.y + 14;

    // Background pill
    doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, 28).fill(COLORS.sectionBg);

    // Left accent bar
    doc.rect(PAGE_MARGIN, y, 4, 28).fill(COLORS.accent);

    doc.font(FONTS.bold)
        .fontSize(12)
        .fillColor(COLORS.primary)
        .text(title, PAGE_MARGIN + 14, y + 8, { width: CONTENT_WIDTH - 14 });

    doc.moveDown(1.2);
}

/**
 * Draws a label+value pair.
 */
function labelValue(doc, label, value, indent = 0) {
    const x = PAGE_MARGIN + indent;
    doc.font(FONTS.bold)
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text(`${label}:`, x, doc.y, { continued: true, width: CONTENT_WIDTH - indent });

    doc.font(FONTS.regular)
        .fontSize(10)
        .fillColor(COLORS.text)
        .text(`  ${safeStr(value)}`, { width: CONTENT_WIDTH - indent });

    doc.moveDown(0.4);
}

/**
 * Draws a bullet list.
 */
function bulletList(doc, items, indent = 0) {
    if (!items || items.length === 0) {
        doc.font(FONTS.oblique).fontSize(10).fillColor(COLORS.muted)
            .text("None identified.", PAGE_MARGIN + indent);
        doc.moveDown(0.4);
        return;
    }
    items.forEach((item) => {
        doc.font(FONTS.regular)
            .fontSize(10)
            .fillColor(COLORS.text)
            .text(`• ${safeStr(item)}`, PAGE_MARGIN + indent, doc.y, {
                width: CONTENT_WIDTH - indent,
            });
        doc.moveDown(0.3);
    });
}

/**
 * Adds a footer to the current page.
 */
function addFooter(doc, pageNumber) {
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 8, PAGE_WIDTH, 1).fill(COLORS.border);
    doc.font(FONTS.regular)
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(
            `Call Insight AI  •  Confidential Report  •  Page ${pageNumber}`,
            PAGE_MARGIN,
            footerY,
            { align: "center", width: CONTENT_WIDTH }
        );
}

// ── Main Builder ─────────────────────────────────────────────────────────────

/**
 * Generates a PDF report for a call analysis record.
 *
 * @param {Object} callData   - Mongoose document (or plain object) of a CallAnalysis record
 * @param {import('http').ServerResponse} res - Express response to pipe the PDF into
 */
const generateInsightPDF = (callData, res) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4", bufferPages: true });

    // Stream directly to the response
    doc.pipe(res);

    let pageNumber = 1;

    // Inject footer before each new page
    doc.on("pageAdded", () => {
        pageNumber++;
    });

    // ── Page 1: Header + Summary + Lead Quality ──────────────────────────────
    drawHeader(doc, callData);

    // Summary
    sectionHeading(doc, "📝 Summary");
    doc.font(FONTS.regular)
        .fontSize(10)
        .fillColor(COLORS.text)
        .text(safeStr(callData.summary), PAGE_MARGIN, doc.y, {
            width: CONTENT_WIDTH,
            align: "justify",
        });
    doc.moveDown(1);

    // Lead Quality
    sectionHeading(doc, "🎯 Lead Quality");
    const lq = callData.lead_quality || {};
    const classification = safeStr(lq.classification, "Not classified");
    const color = leadColor(lq.classification);

    doc.font(FONTS.bold).fontSize(14).fillColor(color)
        .text(classification, PAGE_MARGIN, doc.y);
    doc.moveDown(0.3);
    doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.text)
        .text(safeStr(lq.reasoning, "No reasoning provided."), PAGE_MARGIN, doc.y, {
            width: CONTENT_WIDTH,
        });
    doc.moveDown(1);

    // Sentiment
    sectionHeading(doc, "😊 Sentiment");
    const sent = callData.sentiment || {};
    labelValue(doc, "Overall", sent.overall);
    labelValue(doc, "Customer Tone", sent.customer_tone);
    labelValue(doc, "Agent Tone", sent.agent_tone);
    doc.moveDown(0.5);

    // ── Customer Intent ─────────────────────────────────────────────────────
    sectionHeading(doc, "🧠 Customer Intent");
    const ci = callData.customer_intent || {};
    labelValue(doc, "Goal", ci.goal);
    labelValue(doc, "Interest Level", ci.interest_level);

    doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.muted)
        .text("Key Requirements:", PAGE_MARGIN, doc.y);
    doc.moveDown(0.3);
    bulletList(doc, ci.key_requirements, 10);
    doc.moveDown(0.5);

    // ── Customer Profile ────────────────────────────────────────────────────
    sectionHeading(doc, "👤 Customer Profile");
    const cp = callData.customer_profile || {};
    labelValue(doc, "Current Job", cp.current_job);
    labelValue(doc, "Experience", cp.experience_years);
    labelValue(doc, "Education", cp.education);
    labelValue(doc, "Career Goals", cp.career_goals);
    doc.moveDown(0.5);

    // ── Recommended Course ──────────────────────────────────────────────────
    sectionHeading(doc, "🎓 Recommended Course");
    const rc = callData.recommended_course || {};
    labelValue(doc, "Course", rc.course_name);
    labelValue(doc, "Specialization", rc.specialization);
    labelValue(doc, "Reason", rc.reason);
    doc.moveDown(0.5);

    // ── Pain Points & Objections ────────────────────────────────────────────
    sectionHeading(doc, "⚠️ Customer Pain Points");
    bulletList(doc, callData.customer_pain_points);
    doc.moveDown(0.5);

    sectionHeading(doc, "🚧 Customer Objections");
    bulletList(doc, callData.customer_objections);
    doc.moveDown(0.5);

    // ── Agent Mistakes ──────────────────────────────────────────────────────
    sectionHeading(doc, "❌ Agent Mistakes");
    bulletList(doc, callData.agent_mistakes);
    doc.moveDown(0.5);

    // ── Improvement Suggestions ─────────────────────────────────────────────
    sectionHeading(doc, "💡 Improvement Suggestions");
    bulletList(doc, callData.improvement_suggestions);
    doc.moveDown(0.5);

    // ── Agent Response Analysis ─────────────────────────────────────────────
    const ara = callData.agent_response_analysis || {};

    if (safeArr(ara.incorrect_information)) {
        sectionHeading(doc, "🔍 Agent Response Issues");
        ara.incorrect_information.forEach((item, idx) => {
            doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.text)
                .text(`${idx + 1}. Q: ${safeStr(item.customer_question)}`, PAGE_MARGIN);
            doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.text)
                .text(`   Agent Said: ${safeStr(item.agent_response)}`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
            doc.font(FONTS.oblique).fontSize(9).fillColor(COLORS.accent)
                .text(`   Issue: ${safeStr(item.issue)} — ${safeStr(item.explanation)}`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
            doc.moveDown(0.5);
        });
    }

    if (safeArr(ara.missed_questions)) {
        sectionHeading(doc, "❓ Missed Questions");
        ara.missed_questions.forEach((item, idx) => {
            doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.text)
                .text(`${idx + 1}. Q: ${safeStr(item.customer_question)}`, PAGE_MARGIN);
            doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.text)
                .text(`   Expected: ${safeStr(item.expected_answer)}`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
            doc.moveDown(0.5);
        });
    }

    // ── Footer on all pages ─────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        addFooter(doc, i + 1);
    }

    doc.end();
};

module.exports = { generateInsightPDF };
