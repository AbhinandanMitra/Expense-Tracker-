// Safe root DOM container target check
const cont = document.getElementById('user-container');
let raw_data = [];

try {
    raw_data = JSON.parse(cont.dataset.users || "[]");
} catch (e) {
    console.error("Failed parsing database payload stream:", e);
}

// FIX: Safely unpack regardless of whether Flask returns an array or an object
let user_data = Array.isArray(raw_data) ? raw_data[0] : raw_data;
if (!user_data) {
    user_data = { exp: [], inc: [], exp_totals: [], inc_totals: [] };
}

// Safely merge using fallback protections
let transactions = [...(user_data.exp || []), ...(user_data.inc || [])];

// Sort globally by date (Newest to Oldest)
transactions.sort((a, b) => {
  const dateA = a.date ? new Date(a.date) : new Date(0);
  const dateB = b.date ? new Date(b.date) : new Date(0);
  return dateB - dateA;
});

let monthlyIncome = (user_data.inc_totals || []).reduce((a, b) => a + b, 0);
let monthlyExpenses = (user_data.exp_totals || []).reduce((a, b) => a + b, 0);

document.querySelector('.income-amount').innerText = `\u20B9 ${monthlyIncome.toLocaleString('en-IN')}.00`;
document.querySelector('.expense-amount').innerText = `\u20B9 ${Math.abs(monthlyExpenses).toLocaleString('en-IN')}.00`;

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

function updateDashboard(i) {
  if (i)
    document.querySelector(".income-amount").innerText =
      `\u20B9 ${monthlyIncome.toLocaleString()}.00`;
  else {
    document.querySelector(".expense-amount").innerText =
      `\u20B9 ${monthlyExpenses.toLocaleString()}.00`;
    let spendingLimit = 12000;
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
  const tbody = document.getElementById("transactions-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  transactions.forEach(t => {
    const isInc = t.type === 'income';
    const row = document.createElement("tr");
    const [year, month, day] = t.date.split('-');
    const date = new Date(year, month-1, day);
    const formattedDate = date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    row.innerHTML = `
      <td>${formattedDate || ''}</td>
      <td>${t.description || 'General'}</td>
      <td><span class="status-badge" style="background:${isInc ? '#dcfce7':'#fee2e2'}; color:${isInc ? '#16a34a':'#ef4444'}; padding: 4px 8px; border-radius: 4px;">
        ${t.category_name || 'Uncategorized'}
      </span></td>
      <td style="color: ${isInc ? '#16a34a' : '#ef4444'}; font-weight: bold;">
        ${isInc ? '+' : '-'} ₹${Math.abs(t.amount).toLocaleString('en-IN')}
      </td>
    `;
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
        animation: slideInRight 0.3s ease;
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

const categoryData = {
  labels: user_data.exp_cats,
  values: user_data.exp_totals // Percentages or raw totals
};

// 2. Initialize Charts on Page Load
window.onload = () => {
  const barCtx = document.getElementById("myChart").getContext("2d");
  const doughCtx = document.getElementById("myDough").getContext("2d");

  // Bar Chart
  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
            {
                label: 'Expenses',
                // Use the summary key from Flask
                data: user_data.monthly_exp_summary || Array(12).fill(0), 
                backgroundColor: '#ef4444'
            },
            {
                label: 'Incomes',
                // Use the summary key from Flask
                data: user_data.monthly_inc_summary || Array(12).fill(0),
                backgroundColor: '#16a34a'
            }
        ]
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
  const cat = document.getElementById("incomeCategory").value;
  let dateInput = document.getElementById("incomeDate").value;

  if (!amt || !cat || !dateInput) {
    alert("Please fill in all required fields");
    return;
  }

 const payload = {
  amount: amt,
  category_name: cat,
  date: dateInput,
  description: document.getElementById("incomeDesc").value 
};

  fetch('/add_income', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) throw new Error('Network response failed');
    return response.json();
  })
  .then(data => {
    if (data.status === "success") {
      transactions.unshift(data.income);
      monthlyIncome += amt;
      
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      updateDashboard(1);          
      updateTransactionsTable();   
      closeModal("incomeModal");
      showNotification("Income added successfully", "income");

      const dateObj = new Date(dateInput);
      const monthIndex = dateObj.getMonth();
      
      if (barChart) {
        barChart.data.datasets[1].data[monthIndex] += amt;
        barChart.update();
      }
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Something went wrong saving the transaction.');
  });
});


document.getElementById("expenseForm").addEventListener('submit', (e) => {
  e.preventDefault();

  if (!Array.isArray(transactions)) transactions = [];

  const amt = parseFloat(document.getElementById("expenseAmount").value);
  const cat = document.getElementById("expenseCategory").value;
  let dateInput = document.getElementById("expenseDate").value;

  if (!amt || !cat || !dateInput) {
    alert("Please fill in all required fields");
    return;
  }

 const payload = {
  amount: amt,
  category_name: cat,
  date: dateInput,
  description: document.getElementById("expenseDesc").value // Include description!
};

  fetch('/add_expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) throw new Error('Network response failed');
    return response.json();
  })
  .then(data => {
    if (data.status === "success") {
      transactions.unshift(data.expense);
      monthlyExpenses += amt;

      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      updateDashboard(0);
      updateTransactionsTable();
      closeModal("expenseModal");
      showNotification("Expense added successfully", "expense");

      const dateObj = new Date(dateInput);
      const monthIndex = dateObj.getMonth();
      
      // FIX: Use explicit index 0 for Expenses instead of undefined variable
      if (barChart) {
          barChart.data.datasets[0].data[monthIndex] += amt; 
          barChart.update();
      }

      if (doughnutChart) {
        const catIndex = categoryData.labels.indexOf(cat);
        if (catIndex !== -1) {
            categoryData.values[catIndex] += amt;
            doughnutChart.data.datasets[0].data[catIndex] += amt;
        } else {
            categoryData.labels.push(cat);
            categoryData.values.push(amt);
            doughnutChart.data.datasets[0].data.push(amt);
        }
        doughnutChart.update();
      }
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Something went wrong saving the transaction.');
  });
});

// At the bottom of script.js
document.addEventListener("DOMContentLoaded", () => {
    updateTransactionsTable();
    updateDashboard(0); // Computes totals, displays balances, and syncs visual elements on load
});