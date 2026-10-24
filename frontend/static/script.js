let activeMode = localStorage.getItem("chat_mode") === "general" ? "general" : "trip";
let currentThreadId = null;
let latestAnswerMarkdown = "";
let approvalPending = false;
let conversationHistory = loadHistory(activeMode);

function getThreadKey(mode) {
    return mode === "trip" ? "travel_thread_id" : "chat_thread_id";
}

function getHistoryKey(mode) {
    return `globaltrip_${mode}_history`;
}

function loadHistory(mode) {
    try {
        const history = JSON.parse(localStorage.getItem(getHistoryKey(mode)) || "[]");
        return Array.isArray(history)
            ? history.filter((item) =>
                item
                && (item.role === "user" || item.role === "assistant")
                && typeof item.content === "string"
            ).slice(-40)
            : [];
    } catch (error) {
        console.warn("Could not restore saved conversation history.", error);
        return [];
    }
}

function saveHistory() {
    localStorage.setItem(getHistoryKey(activeMode), JSON.stringify(conversationHistory.slice(-40)));
}

function setMode(mode) {
    if (mode !== "trip" && mode !== "general") {
        return;
    }

    activeMode = mode;
    currentThreadId = localStorage.getItem(getThreadKey(mode)) || null;
    conversationHistory = loadHistory(mode);
    latestAnswerMarkdown = "";

    const isTripMode = mode === "trip";
    document.querySelectorAll(".mode-switch button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    });
    document.getElementById("promptTitle").textContent = isTripMode
        ? "Let’s plan somewhere wonderful"
        : "Your travel sidekick, at your service";
    document.getElementById("promptDescription").textContent = isTripMode
        ? "Share your destination, dates, budget, and what you love doing."
        : "Ask about getting there, what to do, or the little details in between.";
    document.getElementById("heroTitle").innerHTML = isTripMode
        ? "Big plans. <span>Better journeys.</span>"
        : "Curious about travel? <span>Let’s explore.</span>";
    document.getElementById("heroDescription").textContent = isTripMode
        ? "From the first flight to the last sunset, bring your travel ideas and we’ll help make them happen."
        : "Get thoughtful travel tips, destination ideas, and helpful answers for wherever life takes you.";
    document.getElementById("userInput").placeholder = isTripMode
        ? "Tell us where you’d like to go, for how long, and what matters most..."
        : "Ask about destinations, packing, flights, food, or anything travel...";
    document.getElementById("btnText").textContent = isTripMode ? "Create my trip" : "Ask GlobalTrip";
    document.getElementById("tripPrompts").classList.toggle("hidden", !isTripMode);
    document.getElementById("chatPrompts").classList.toggle("hidden", isTripMode);
    document.querySelector(".download-btn").classList.toggle("hidden", !isTripMode);
    document.getElementById("resultTitle").textContent = isTripMode
        ? "Your trip, taking shape"
        : "Your travel conversation";
    document.querySelector(".pdf-title").textContent = isTripMode
        ? "GlobalTrip AI — Travel Plan"
        : "A note from GlobalTrip AI";

    localStorage.setItem("chat_mode", mode);
    renderConversation();
    syncApprovalVisibility();
}

function setPrompt(text) {
    const input = document.getElementById("userInput");
    input.value = text;
    updateCharacterCount();
    input.focus();
}

function updateCharacterCount() {
    const input = document.getElementById("userInput");
    document.getElementById("characterCount").textContent = `${input.value.length} / ${input.maxLength}`;
}

function setLoading(isLoading) {
    const sendBtn = document.getElementById("sendBtn");
    const btnText = document.getElementById("btnText");
    const btnLoader = document.getElementById("btnLoader");

    sendBtn.disabled = isLoading;
    document.querySelectorAll(".mode-switch button, .prompt-cards button").forEach((button) => {
        button.disabled = isLoading;
    });

    if (isLoading) {
        btnText.textContent = activeMode === "trip" ? "Planning your trip..." : "Finding an answer...";
        btnText.classList.remove("hidden");
        btnLoader.classList.remove("hidden");
    } else {
        btnText.textContent = activeMode === "trip" ? "Create my trip" : "Ask GlobalTrip";
        btnLoader.classList.add("hidden");
    }

    document.querySelector(".send-arrow").classList.toggle("hidden", isLoading);
}

function showError(message) {
    const errorBox = document.getElementById("errorBox");
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    const errorBox = document.getElementById("errorBox");
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
}

function appendMessage(role, content) {
    conversationHistory.push({ role, content });
    conversationHistory = conversationHistory.slice(-40);
    saveHistory();
}

function renderMarkdown(target, markdown) {
    if (typeof marked !== "undefined") {
        target.innerHTML = marked.parse(markdown);
    } else {
        target.textContent = markdown;
    }
}

function renderConversation() {
    const conversationList = document.getElementById("conversationList");
    const resultSection = document.getElementById("resultSection");
    const threadInfo = document.getElementById("threadInfo");
    const resultBox = document.getElementById("resultBox");
    const pdfContent = document.getElementById("pdfContent");

    conversationList.replaceChildren();
    resultSection.classList.toggle("hidden", conversationHistory.length === 0);

    const lastAssistantIndex = conversationHistory.findLastIndex
        ? conversationHistory.findLastIndex((item) => item.role === "assistant")
        : conversationHistory.map((item) => item.role).lastIndexOf("assistant");
    const lastAssistantMessage = lastAssistantIndex >= 0
        ? conversationHistory[lastAssistantIndex]
        : null;
    latestAnswerMarkdown = lastAssistantMessage ? lastAssistantMessage.content : "";
    pdfContent.classList.toggle("hidden", !lastAssistantMessage);
    renderMarkdown(resultBox, latestAnswerMarkdown);

    conversationHistory.forEach((item, index) => {
        const message = document.createElement("article");
        message.className = `message-row ${item.role === "user" ? "user-message" : "assistant-message"}`;

        if (item.role === "user") {
            const avatar = document.createElement("span");
            avatar.className = "message-avatar user-avatar";
            avatar.textContent = "YOU";

            const content = document.createElement("p");
            content.className = "user-message-content";
            content.textContent = item.content;
            message.append(avatar, content);
        } else {
            const avatar = document.createElement("span");
            avatar.className = "message-avatar assistant-avatar";
            avatar.setAttribute("aria-hidden", "true");
            avatar.textContent = "✦";

            const card = document.createElement("div");
            card.className = "assistant-message-card";
            const label = document.createElement("span");
            label.className = "assistant-label";
            label.textContent = "GLOBALTRIP AI";

            card.append(label);
            if (index === lastAssistantIndex) {
                pdfContent.classList.remove("hidden");
                card.classList.add("latest-assistant-card");
                card.append(pdfContent);
            } else {
                const content = document.createElement("div");
                content.className = "assistant-message-content";
                renderMarkdown(content, item.content);
                card.append(content);
            }
            message.append(avatar, card);
        }

        conversationList.append(message);
    });

    threadInfo.textContent = conversationHistory.length
        ? `${conversationHistory.length} messages in this conversation`
        : "Your conversation is ready.";

    if (conversationHistory.length) {
        resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function showResult(answer, threadId) {
    appendMessage("assistant", answer);
    currentThreadId = threadId || currentThreadId;
    renderConversation();
}

function showApprovalSection(text, threadId) {
    const approvalText = document.getElementById("approvalRequestText");
    const approvalTextarea = document.getElementById("approvalFeedback");

    approvalText.textContent = text || "Please review the generated draft itinerary.";
    approvalTextarea.value = "";
    approvalPending = true;
    currentThreadId = threadId || currentThreadId;
    syncApprovalVisibility();
}

function syncApprovalVisibility() {
    document.getElementById("approvalSection").classList.toggle(
        "hidden",
        !approvalPending || activeMode !== "trip"
    );
}

function hideApprovalSection() {
    approvalPending = false;
    document.getElementById("approvalSection").classList.add("hidden");
    document.getElementById("approvalFeedback").value = "";
}

async function submitApproval(approved) {
    const feedback = document.getElementById("approvalFeedback").value.trim();

    hideError();
    if (!currentThreadId) {
        showError("No trip conversation is active for approval.");
        return;
    }
    if (!approved && !feedback) {
        showError("Please tell us what you’d like changed before requesting a revision.");
        document.getElementById("approvalFeedback").focus();
        return;
    }

    setLoading(true);
    try {
        const response = await fetch("/api/travel/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ thread_id: currentThreadId, approved, feedback })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Could not submit your approval decision.");
        }

        appendMessage("user", approved ? "I approved the draft itinerary." : `Please revise the draft: ${feedback}`);
        hideApprovalSection();
        showResult(data.answer, data.thread_id);
        if (data.requires_approval) {
            showApprovalSection(data.approval_request, data.thread_id);
        }
    } catch (error) {
        showError(error instanceof Error ? error.message : "Could not submit your approval decision.");
    } finally {
        setLoading(false);
    }
}

async function sendMessage() {
    hideError();
    const input = document.getElementById("userInput");
    const message = input.value.trim();

    if (!message) {
        showError("Tell us a little about what you’re looking for first.");
        input.focus();
        return;
    }

    setLoading(true);
    try {
        const isTripMode = activeMode === "trip";
        const response = await fetch(isTripMode ? "/api/travel" : "/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, thread_id: currentThreadId })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Something went wrong. Please try again.");
        }

        currentThreadId = data.thread_id;
        localStorage.setItem(getThreadKey(activeMode), currentThreadId);
        appendMessage("user", message);
        showResult(data.answer, data.thread_id);
        input.value = "";
        updateCharacterCount();

        if (isTripMode && data.requires_approval) {
            showApprovalSection(data.approval_request, data.thread_id);
        } else {
            hideApprovalSection();
        }
    } catch (error) {
        console.error("Travel request failed.", error);
        showError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
        setLoading(false);
    }
}

function startNewConversation() {
    if (conversationHistory.length && !window.confirm("Start fresh? This removes the current conversation from this browser.")) {
        return;
    }

    localStorage.removeItem(getThreadKey(activeMode));
    localStorage.removeItem(getHistoryKey(activeMode));
    currentThreadId = null;
    conversationHistory = [];
    latestAnswerMarkdown = "";
    if (activeMode === "trip") {
        hideApprovalSection();
    }
    hideError();
    renderConversation();
    document.getElementById("userInput").focus();
}

async function copyResult() {
    if (!latestAnswerMarkdown) {
        showError("There isn’t an answer to copy yet.");
        return;
    }

    try {
        await navigator.clipboard.writeText(latestAnswerMarkdown);
        const copyButton = document.querySelector(".copy-btn");
        const oldText = copyButton.textContent;
        copyButton.textContent = "Copied!";
        setTimeout(() => {
            copyButton.textContent = oldText;
        }, 1400);
    } catch (error) {
        showError("Could not copy the answer. Check your browser clipboard permissions.");
    }
}

function downloadPDF() {
    const pdfContent = document.getElementById("pdfContent");
    if (!latestAnswerMarkdown || activeMode !== "trip") {
        showError("Create a trip plan before downloading it.");
        return;
    }
    if (typeof html2pdf === "undefined") {
        showError("The PDF tool did not load. Check your connection and try again.");
        return;
    }

    const downloadButton = document.querySelector(".download-btn");
    const oldText = downloadButton.textContent;
    downloadButton.textContent = "Preparing PDF...";
    downloadButton.disabled = true;

    html2pdf()
        .set({
            margin: 0.5,
            filename: "globaltrip-ai-travel-plan.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"] }
        })
        .from(pdfContent)
        .save()
        .then(() => {
            downloadButton.textContent = oldText;
            downloadButton.disabled = false;
        })
        .catch(() => {
            downloadButton.textContent = oldText;
            downloadButton.disabled = false;
            showError("Could not download the PDF. Please try again.");
        });
}

document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => setPrompt(button.dataset.prompt));
});
document.getElementById("userInput").addEventListener("input", updateCharacterCount);
document.getElementById("userInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});
document.getElementById("approveBtn").addEventListener("click", () => submitApproval(true));
document.getElementById("reviseBtn").addEventListener("click", () => submitApproval(false));
document.getElementById("newConversationBtn").addEventListener("click", startNewConversation);

setMode(activeMode);
updateCharacterCount();
