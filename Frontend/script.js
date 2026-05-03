let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

let monthlyIncome = 22336,
  monthlyExpenses = 7104;
const today = new Date().toISOString().split("T")[0];

function openIncomeModal() {
  document.getElementById("incomeDate").value = today;
  document.getElementById("incomeModal").style.display = "block";
  document.body.style.overflow = "hidden";
}

function openExpenseModal() {
  document.getElementById("expenseDate").value = today;
  document.getElementById("expenseModal").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
  document.body.style.overflow = "auto";
  if (modalId === "incomeModal") document.getElementById("incomeForm").reset();
  else document.getElementById("expenseForm").reset();
}

window.onclick = (e) => {
  if (e.target === document.getElementById("incomeModal"))
    closeModal("incomeModal");
  else if (e.target === document.getElementById("expenseModal"))
    closeModal("expenseModal");
};

function addIncome() {
  const amount = parseFloat(document.querySelector("#incomeAmount").value);
  const category = document.querySelector("#incomeCategory").value;
  const desc = document.querySelector("#incomeDesc").value;
  const date = document.querySelector("#incomeDate").value;

 
}

function addExpense() {
  const amount = parseFloat(document.querySelector("#expenseAmount").value);
  const category = document.querySelector("#expenseCategory").value;
  const desc = document.querySelector("#expenseDesc").value;
  const date = document.querySelector("#expenseDate").value;

  
}

function updateDashboard(i) {
  if (i)
    document.querySelector(".income-amount").textContent =
      `${monthlyIncome.toLocaleString()}.00`;
  else {
    document.querySelector(".expense-amount").textContent =
      `${monthlyExpenses.toLocaleString()}.00`;
    let spendingLimit = 24000;
    const usedAmount = monthlyExpenses;
    const percentage = (usedAmount / spendingLimit) * 100;
    document.querySelector(".spending-limit").textContent = `${(
      spendingLimit - usedAmount
    ).toLocaleString()}.00`;
    document.querySelector(".progress-fill").style.width = `${Math.min(
      percentage,
      100,
    )}%`;
  }
}

function updateTransactionsTable() {
  if (!Array.isArray(transactions)) transactions = [];

  const tbody = document.querySelector(".transactions-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Slicing to show recent 10, preventing infinite growth

  const recentTransactions = transactions.slice(0, 10);

  recentTransactions.forEach((transaction) => {
    const row = document.createElement("tr");
    const formattedDate = new Date(transaction.date).toLocaleDateString(
      "en-Us",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );

    // FIX: Check if category is "Salary" or "Freelance" to treat as income
    const isIncome =
      transaction.category === "Salary" ||
      transaction.category === "Freelance" ||
      transaction.amount > 0;

    // Clean up the amount display: remove the hardcoded sign from this variable
    const amountValue = Math.abs(transaction.amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const sign = isIncome ? "+" : "-";
    const color = isIncome ? "#10b981" : "#ef4444";

    row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${transaction.category || "Others..."}</td> 
            <td style="color: ${color}">
                ${sign} &#x20B9;${amountValue}
            </td>
        `;
    // transaction.category || "General" handles the 'undefined' error in your screenshot

    tbody.appendChild(row);
  });
}

function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        top: 2rem;
        z-index: 1000;
        animation: slideInRight 0.3 ease;
        right: 2rem;
        background: ${type === "income" ? "#10b981" : "#ef4444"};
    `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

const style = document.createElement("style");
style.textContent = `
    @keyframes slideInRight{
        from{transform: translateX(100%); opacity: 0;}
        to {transform: translateX(0); opacity: 1;}
    }
    @keyframes slideOutRight{
        from{transform: translateX(0); opacity: 1;}
        to {transform: translateX(100%); opacity: 0;}
    }`;

document.head.appendChild(style);

document.addEventListener("DOMContentLoaded", () => {
  updateTransactionsTable();
});


// dark mode

const themeSwitch = document.getElementById("theme-switch");

themeSwitch.addEventListener("click", () => {
  console.log("hii");
  const isDark = document.body.classList.toggle("dark-mode");
  if (isDark) localStorage.setItem("dark-mode", "active");
  else localStorage.setItem("dark-mode", "inactive");
});

const items = document.querySelectorAll(".accordion button");

function toggleAnimation() {
  const itemToggle = this.getAttribute("aria-expanded");

  for (let i = 0; i < items.length; ++i)
    items[i].setAttribute("aria-expanded", "false");

  if (itemToggle == "false") this.setAttribute("aria-expanded", "true");
}

items.forEach((item) => item.addEventListener("click", toggleAnimation));


// Chart.js
//Dynamic update of data visualization diagrams

// 1. Global Chart Instances
let barChart, doughnutChart;

// Initial Data Structures
const monthlyData = {
  labels: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ],
  income: [100, 50, 60, 40, 70, 50, 40, 40, 70, 100, 110, 90], // Sample units
  expense: [120, 80, 30, 50, 20, 30, 70, 100, 90, 60, 70, 110],
};

const categoryData = {
  labels: [
    "Food & Healthcare",
    "Transport",
    "Shopping",
    "Entertainment",
    "Utilities",
  ],
  values: [25, 15, 30, 30, 12], // Percentages or raw totals
};

// 2. Initialize Charts on Page Load
window.onload = () => {
  const barCtx = document.getElementById("myChart").getContext("2d");
  const doughCtx = document.getElementById("myDough").getContext("2d");

  // Bar Chart
  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: monthlyData.labels,
      datasets: [
        {
          label: "Expense",
          data: monthlyData.expense,
          backgroundColor: "#ff4d4d",
        },
        {
          label: "Income",
          data: monthlyData.income,
          backgroundColor: "#00a86b",
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        tooltip: {
          enabled: false,
        },

        title: {
          display: true,
          text: "Revenue Trends",
          font: {
            size: 18,
            weight: "bold",
          },
          position: "bottom",
        },

        legend: {
          display: true,
          position: "bottom",
          align: "end",
          labels: {
            font: {
              weight: "bold",
            },
            boxWidth: 13,
          },
        },
      },
    },
  });

  // Doughnut Chart
  doughnutChart = new Chart(doughCtx, {
    type: "doughnut",
    data: {
      labels: categoryData.labels,
      datasets: [
        {
          data: categoryData.values,
          backgroundColor: [
            "#ff6384",
            "#355c7d",
            "#f8b195",
            "#6c5b7b",
            "#c06c84",
          ],
          borderWidth: 0,
          hoverBorderWidth: 0
        },
      ],
    },
    options: {
      responsive: true,
      cutout: 40,
      plugins: {
        legend: {
          display: true,
          labels: {
            boxBorderWidth: 0,
            font: {
              weight: "bold",
            },
            boxWidth: 13,
          },
        },
      },
    },
  });
};

// 3. Logic to Update Charts Dynamically
document.getElementById("incomeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  
  if (!Array.isArray(transactions)) transactions = [];

  const amt = parseFloat(document.getElementById("incomeAmount").value);
  let dateInput = document.getElementById("incomeDate").value;
  const cat = document.getElementById("incomeCategory").value;

  const monthIndex = new Date(dateInput).getMonth();
  
  const newTransaction = {
    id: Date.now(), // More unique than length + 1
    category: cat,
    date: dateInput,
    amount: amt,
    type: "Income"
  };

  transactions.unshift(newTransaction);
  monthlyIncome += amt;
  
  localStorage.setItem("transactions", JSON.stringify(transactions));
  
  // Update UI
  updateDashboard(1);
  updateTransactionsTable();
  closeModal("incomeModal");
  showNotification("Income added successfully", "income");

  // Update Chart
  if(barChart) {
    barChart.data.datasets[1].data[monthIndex] += (amt/100);
    barChart.update();
  }
});

document.getElementById("expenseForm").addEventListener('submit', (e)=> {
  e.preventDefault();
  if (!Array.isArray(transactions)) transactions = [];

  const amt = parseFloat(document.getElementById("expenseAmount").value);
  const cat = document.getElementById("expenseCategory").value;
  let dateInput = document.getElementById("expenseDate").value;

  if (!amt || !cat || !dateInput) {
    alert("Please fill in all required fields");
    return;
  }

  // 2. Prepare data
  const dateObj = new Date(dateInput);
  const monthIndex = dateObj.getMonth();
  
  const newTransaction = {
    id: Date.now(), // Unique ID using timestamp
    date: dateInput,
    category: cat,
    amount: -amt,
    type: "Expense"
  };

  // 3. Update Data State
  transactions.unshift(newTransaction);
  monthlyExpenses += amt;
  localStorage.setItem("transactions", JSON.stringify(transactions));

  // 4. Update UI Components
  updateDashboard(0);
  updateTransactionsTable();
  closeModal("expenseModal");
  showNotification("Expense added successfully", "expense");

  // 5. Update Charts
  if (barChart) {
    barChart.data.datasets[0].data[monthIndex] += (amt/100);
    barChart.update();
  }

  if (doughnutChart) {
    const catIndex = categoryData.labels.indexOf(cat);
    if (catIndex !== -1) {
      doughnutChart.data.datasets[0].data[catIndex] += (amt/100);
      doughnutChart.update();
    }
  }
});