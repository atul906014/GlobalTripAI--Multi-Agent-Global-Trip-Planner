let activeMode = localStorage.getItem("chat_mode") === "general" ? "general" : "trip";
let currentThreadId = null;
let latestAnswerMarkdown = "";

function setMode(mode) {
    activeMode = mode;
    const isTripMode = mode === "trip";
    const threadKey = isTripMode ? "travel_thread_id" : "chat_thread_id";
    currentThreadId = localStorage.getItem(threadKey) || null;

    document.querySelectorAll(".mode-switch button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    });

    document.getElementById("promptTitle").textContent = isTripMode
        ? "Where do you want to go?"
        : "What would you like to chat about?";
    document.getElementById("promptDescription").textContent = isTripMode
        ? "Example: Plan a complete 7 days trip from Bangalore to Sikkim."
        : "Ask a question or continue your conversation.";
    document.getElementById("userInput").placeholder = isTripMode
        ? "Plan a complete 7 days Sikkim trip including flights, hotels and sightseeing under 2 lakhs..."
        : "Ask me anything...";
    document.getElementById("btnText").textContent = isTripMode ? "Generate Plan" : "Send Message";
    document.querySelector(".quick-prompts").classList.toggle("hidden", !isTripMode);
    document.querySelector(".download-btn").classList.toggle("hidden", !isTripMode);
    document.getElementById("resultTitle").textContent = isTripMode
        ? "Your AI Travel Plan"
        : "Assistant Response";

    localStorage.setItem("chat_mode", mode);
}

function setPrompt(text) {
    document.getElementById("userInput").value = text;
}

function setLoading(isLoading) {
    const sendBtn = document.getElementById("sendBtn");
    const btnText = document.getElementById("btnText");
    const btnLoader = document.getElementById("btnLoader");

    sendBtn.disabled = isLoading;

    if (isLoading) {
        btnText.classList.add("hidden");
        btnLoader.classList.remove("hidden");
    } else {
        btnText.classList.remove("hidden");
        btnLoader.classList.add("hidden");
    }
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

function showResult(answer, threadId) {
    latestAnswerMarkdown = answer;

    const resultSection = document.getElementById("resultSection");
    const resultBox = document.getElementById("resultBox");
    const threadInfo = document.getElementById("threadInfo");

    if (typeof marked !== "undefined") {
        resultBox.innerHTML = marked.parse(answer);
    } else {
        resultBox.innerText = answer;
    }

    threadInfo.textContent = `Thread ID: ${threadId}`;

    resultSection.classList.remove("hidden");

    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function showApprovalSection(text, threadId) {
    const approvalSection = document.getElementById("approvalSection");
    const approvalText = document.getElementById("approvalRequestText");
    const approvalTextarea = document.getElementById("approvalFeedback");

    if (!approvalSection) {
        return;
    }

    approvalText.textContent = text || "Please review the generated draft itinerary.";
    approvalTextarea.value = "";
    approvalSection.classList.remove("hidden");
    currentThreadId = threadId || currentThreadId;
}

function hideApprovalSection() {
    const approvalSection = document.getElementById("approvalSection");
    if (approvalSection) {
        approvalSection.classList.add("hidden");
    }
    const approvalTextarea = document.getElementById("approvalFeedback");
    if (approvalTextarea) {
        approvalTextarea.value = "";
    }
}

async function submitApproval(approved) {
    const approvalTextarea = document.getElementById("approvalFeedback");
    const feedback = approvalTextarea ? approvalTextarea.value.trim() : "";

    if (!currentThreadId) {
        showError("No thread is active for approval.");
        return;
    }

    if (!approved && !feedback) {
        showError("Please provide revision feedback when requesting changes.");
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/travel/approve", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                thread_id: currentThreadId,
                approved,
                feedback
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Could not submit your approval decision.");
        }

        hideApprovalSection();
        showResult(data.answer, data.thread_id);
        if (data.requires_approval) {
            showApprovalSection(data.approval_request || "Please review the generated draft itinerary.", data.thread_id);
        }

    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

async function sendMessage() {
    hideError();

    const input = document.getElementById("userInput");
    const message = input.value.trim();

    if (!message) {
        showError("Please enter a message first.");
        return;
    }

    setLoading(true);

    try {
        const isTripMode = activeMode === "trip";
        const threadKey = isTripMode ? "travel_thread_id" : "chat_thread_id";
        const response = await fetch(isTripMode ? "/api/travel" : "/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                thread_id: currentThreadId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Something went wrong.");
        }

        currentThreadId = data.thread_id;
        localStorage.setItem(threadKey, currentThreadId);

        showResult(data.answer, data.thread_id);

        if (isTripMode && data.requires_approval) {
            showApprovalSection(data.approval_request || "Please review the generated draft itinerary.", data.thread_id);
        } else {
            hideApprovalSection();
        }

    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

function copyResult() {
    const resultBox = document.getElementById("resultBox");
    const text = resultBox.innerText;

    if (!text) {
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => {
            const copyBtn = document.querySelector(".copy-btn");
            const oldText = copyBtn.textContent;

            copyBtn.textContent = "Copied!";

            setTimeout(() => {
                copyBtn.textContent = oldText;
            }, 1400);
        })
        .catch(() => {
            showError("Could not copy result.");
        });
}

function downloadPDF() {
    const pdfContent = document.getElementById("pdfContent");

    if (!latestAnswerMarkdown || !pdfContent) {
        showError("No travel plan available to download.");
        return;
    }

    const downloadBtn = document.querySelector(".download-btn");
    const oldText = downloadBtn.textContent;

    downloadBtn.textContent = "Preparing PDF...";
    downloadBtn.disabled = true;

    const options = {
        margin: 0.5,
        filename: "ai-travel-plan.pdf",
        image: {
            type: "jpeg",
            quality: 0.98
        },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        },
        jsPDF: {
            unit: "in",
            format: "a4",
            orientation: "portrait"
        },
        pagebreak: {
            mode: ["avoid-all", "css", "legacy"]
        }
    };

    html2pdf()
        .set(options)
        .from(pdfContent)
        .save()
        .then(() => {
            downloadBtn.textContent = oldText;
            downloadBtn.disabled = false;
        })
        .catch(() => {
            downloadBtn.textContent = oldText;
            downloadBtn.disabled = false;
            showError("Could not download PDF.");
        });
}

document.addEventListener("keydown", function(event) {
    if (event.ctrlKey && event.key === "Enter") {
        sendMessage();
    }
});

document.getElementById("approveBtn")?.addEventListener("click", function() {
    submitApproval(true);
});

document.getElementById("reviseBtn")?.addEventListener("click", function() {
    submitApproval(false);
});

setMode(activeMode);