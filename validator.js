const form = document.querySelector("#regForm");
const sections = Array.from(form.querySelectorAll(".step"));
const fields = Array.from(form.querySelectorAll("input, select, textarea"));
const summary = document.querySelector("#error-summary");
const status = document.querySelector("#projectStatus");
let currentStep = 0;

fields.forEach(function (field) {
  if (!field.id) field.id = "field-" + fields.indexOf(field);
  let error = document.getElementById(field.id + "_err");
  if (!error) {
    error = document.createElement("p");
    error.id = field.id + "_err";
    error.className = "field-error";
    field.insertAdjacentElement("afterend", error);
  }
  const describedBy = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
  describedBy.add(error.id);
  field.setAttribute("aria-describedby", Array.from(describedBy).join(" "));
  error.setAttribute("aria-live", "polite");
});

function customMessage(field) {
  // TODO: return a message for each failed custom rule; return "" when valid.
  // fullname: reject whitespace-only / punctuation-only names.
  // campusEmail: require exactly the domain student.gsu.edu after @.
  // password: 8+ characters, upper, lower, digit, and a non-whitespace symbol.
  // confirm: compare against password.value without trimming either password.
  // interests: selectedOptions.length must be 1-3.
  // bio: explicitly reject value.length > 140, including programmatically set values.
    const value = field.value;
    switch (field.id) {
        case "fullname":
        if (!value.trim()) {
            return "Full name cannot be empty or whitespace only.";
        }

        if (!/[A-Za-z]/.test(value)) {
            return "Full name must contain at least one letter.";
        }
        return "";

        case "campusEmail": {
        const emailPattern = /^[^@\s]+@student\.gsu\.edu$/i;

        if (!emailPattern.test(value)) {
            return "Enter an email address ending exactly with @student.gsu.edu.";
        }
        return "";
        }

        case "studentId":
        if (!/^[1-9]\d{8}$/.test(value)) {
            return "Student ID must contain exactly 9 digits and start with 1-9.";
        }
        return "";

        case "password":
        if (value.length < 8) {
            return "Password must contain at least 8 characters.";
        }
        if (!/[A-Z]/.test(value)) {
            return "Password must contain at least one uppercase letter.";
        }
        if (!/[a-z]/.test(value)) {
            return "Password must contain at least one lowercase letter.";
        }
        if (!/[0-9]/.test(value)) {
            return "Password must contain at least one digit.";
        }
        if (!/[^\w\s]/.test(value)) {
            return "Password must contain at least one non-whitespace symbol.";
        }
        return "";

        case "confirm":
        if (value !== document.querySelector("#password").value) {
            return "Passwords do not match.";
        }
        return "";

        case "interests": {
        const count = field.selectedOptions.length;
        if (count < 1 || count > 3) {
            return "Select between 1 and 3 interests.";
        }
        return "";
        }

        case "bio":
        if (value.length > 140) {
            return "Bio cannot exceed 140 characters.";
        }
        return "";

        default:
        return "";
    }
}

function checkField(field) {
  field.setCustomValidity("");
  field.setCustomValidity(customMessage(field));
  const valid = field.checkValidity();
  document.getElementById(field.id + "_err").textContent = valid ? "" : field.validationMessage;
  field.setAttribute("aria-invalid", String(!valid));
  return valid;
}

function showStep(index) {
  currentStep = index;
  sections.forEach(function (section, i) { section.classList.toggle("active", i === index); });
  document.querySelector("#stepNum").textContent = index + 1;
  summary.hidden = true;
  sections[index].querySelector("h2").focus();
}

function showErrors(invalid) {
  summary.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = "Please correct these fields";
  const list = document.createElement("ul");
  invalid.forEach(function (field) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + field.id;
    link.textContent = field.name + ": " + field.validationMessage;
    link.addEventListener("click", function (event) {
      event.preventDefault();
      showStep(sections.indexOf(field.closest(".step")));
      field.focus();
    });
    item.appendChild(link);
    list.appendChild(item);
  });
  summary.append(heading, list);
  summary.hidden = false;
  summary.focus();
}

function buildReview() {
  const review = document.querySelector("#reviewSummary");
  review.replaceChildren();
  // TODO: add a safe summary of each non-secret value using textContent.

  function addSummary(label, value) {
    const note = document.createElement("p");
    note.textContent = label + ": " + value;
    review.appendChild(note);
  }

    // Identity information
    addSummary("Full Name", document.querySelector("#fullname").value);
    addSummary("Campus Email", document.querySelector("#campusEmail").value);
    addSummary("Student ID", document.querySelector("#studentId").value);

    addSummary("Password", "hidden");

    const tier = document.querySelector('input[name="tier"]:checked');
    addSummary("Tier", tier ? tier.value : "Not selected");

    const interests = Array.from(
        document.querySelector("#interests").selectedOptions
    ).map(function(option) {
        return option.textContent;
    });

    addSummary("Interests", interests.join(", "));

    const bio = document.querySelector("#bio").value;
    addSummary("Bio", bio || "No bio provided");

    const terms = document.querySelector("#terms").checked;
    addSummary("Terms Accepted", terms ? "Yes" : "No");

  ["Identity", "Security", "Profile"].forEach(function (title, index) {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit " + title;
    edit.addEventListener("click", function () { showStep(index); });
    review.appendChild(edit);
  });
}

form.addEventListener("click", function (event) {
  if (event.target.closest("[data-back]")) showStep(Math.max(0, currentStep - 1));
  if (event.target.closest("[data-next]")) {
    const invalid = fields.filter(function (field) {
      return sections[currentStep].contains(field) && !checkField(field);
    });
    if (invalid.length) { showErrors(invalid); return; }
    if (currentStep === 2) buildReview();
    showStep(Math.min(3, currentStep + 1));
  }
});

fields.forEach(function (field) {
  field.addEventListener("blur", function () { checkField(field); });
  field.addEventListener("input", function () {
    status.textContent = "";
    if (field.getAttribute("aria-invalid") === "true") checkField(field);
    // TODO: recheck confirmation if password changes after confirmation was entered.
    if (field.id === "password") {
      const confirm = document.querySelector("#confirm");
      if (confirm.value !== "") {
        checkField(confirm);
      }
      updatePasswordRules();
    }
  });
  field.addEventListener("change", function () {
    if (field.getAttribute("aria-invalid") === "true") {
      checkField(field);
    }
  });
});
document.querySelector("#bio").addEventListener("input", function (event) {
  document.querySelector("#bioCount").textContent = 140 - event.target.value.length;
});
// TODO: update each #pwRules item on password input; show "Met" / "Needed" text.
function updatePasswordRules() {
  const password = document.querySelector("#password").value;
  const rules = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: /[^\w\s]/.test(password)
  };
  document.querySelectorAll("#pwRules li").forEach(function (item) {
    const rule = item.dataset.rule;
    const met = rules[rule];
    const originalText = {
      len: "At least 8 characters",
      upper: "One uppercase letter",
      lower: "One lowercase letter",
      digit: "One digit",
      symbol: "One symbol (!@#$…)"
    };
    item.textContent =
      originalText[rule] + (met ? " - Met" : " - Needed");
    item.style.color = met ? "green" : "red";
  });
}

// Initialize password checklist
updatePasswordRules();

form.addEventListener("submit", function (event) {
  event.preventDefault();
  const invalid = fields.filter(function (field) { return !checkField(field); });
  if (invalid.length) { showErrors(invalid); return; }
  buildReview();
  showStep(3);
  status.textContent = "Implemented checks passed. Nothing sent. Complete all TODOs before submitting this project.";
});
showStep(0);