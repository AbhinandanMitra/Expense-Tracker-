// Safe root DOM container target check
const cont = document.getElementById('user-container');
let raw_data = {};

if (cont && cont.dataset && cont.dataset.users) {
    try {
        raw_data = JSON.parse(cont.dataset.users);
    } catch (e) {
        console.error("Failed parsing database payload:", e);
    }
} else {
    // This warning will tell you exactly if the HTML element is missing
    console.warn("Database container 'user-container' not found in HTML.");
}

// Ensure user_data isn't null even if the database is empty
let user_data = raw_data || { exp: [], inc: [], exp_totals: [], inc_totals: [] };
let transactions = [...(user_data.exp || []), ...(user_data.inc || [])];

// Sort globally by date (Newest to Oldest)
transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
        const spendingLimit = 25000;
        const usedAmount = monthlyExpenses;
        const percentage = (usedAmount / spendingLimit) * 100;
        
        const remainingText = document.querySelector(".spending-limit");
        const progressFill = document.querySelector(".progress-fill");

        // Calculate color based on percentage
        let statusColor = "#16a34a"; // Default Green (Low)
        if (percentage > 80) {
            statusColor = "#ef4444"; // Red (High)
        } else if (percentage > 50) {
            statusColor = "#fcc419"; // Orange/Amber (Medium)
        }

        // Apply adaptive colors
        if (remainingText) remainingText.style.color = statusColor;
        if (progressFill) {
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
            progressFill.style.backgroundColor = statusColor;
        }

        document.querySelector(".spending-limit").textContent = `\u20B9 ${(spendingLimit - usedAmount).toLocaleString()}.00`;
    }
}

function updateTransactionsTable() {
  const tbody = document.getElementById("transactions-tbody");
    if (!tbody) return; // Prevent crashes if the table isn't loaded yet

    // 1. Check if the new filter elements exist in your HTML.
    // If they don't exist yet, default to 'all' so nothing breaks!
    const filterUnified = document.getElementById("filterUnified");
    
    const unifiedValue = filterUnified ? filterUnified.value : 'all';

    const filtered = transactions.filter(t => {
      let matchesUnified = true;
        // Check Unified Selection (Income vs Expense vs Category)
        if (unifiedValue === 'type:income') {
            matchesUnified = (t.type === 'income');
        } else if (unifiedValue === 'type:expense') {
            matchesUnified = (t.type === 'expense');
        } else if (unifiedValue.startsWith('cat:')) {
            const targetCat = unifiedValue.replace('cat:', '');
            matchesUnified = (t.category_name === targetCat);
        }
        return matchesUnified;
    });

    tbody.innerHTML = "";

  filtered.forEach(t => {
    const isInc = t.type === 'income';
    const row = document.createElement("tr");
    const [year, month, day] = t.date.split('-');
    const date = new Date(year, month-1, day);
    const formattedDate = date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    row.innerHTML = `
            <td>${formattedDate || ''}</td>
            <td>${t.description || 'General'}</td>
            <td>
                <span class="status-badge" style="background:${isInc ? '#dcfce7':'#fee2e2'}; color:${isInc ? '#16a34a':'#ef4444'}; padding: 4px 8px; border-radius: 4px;">
                    ${t.category_name || 'Uncategorized'}
                </span>
            </td>
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
  const isDarkMode = document.body.classList.toggle('dark-mode');
    const themeBtn = document.getElementById('theme-switch');

    if (isDarkMode) {
        // Use the Sun symbol for switching back to light mode
        themeBtn.innerHTML = '<span style="color: white;">&#9728;</span>'; 
    } else {
        // Use the Moon symbol
        themeBtn.innerHTML = '&#9790;';
    }
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
let areaChart, doughnutChart;

// Initial Data Structures

const categoryData = {
  labels: user_data.exp_cats,
  values: user_data.exp_totals // Percentages or raw totals
};

// 2. Initialize Charts on Page Load
window.onload = () => {
  const now = new Date();
  const year = now.getFullYear();

// Add 1 to month and pad with a leading zero if less than 10
const month = String(now.getMonth() + 1).padStart(2, '0');

// Pad the day with a leading zero as well
const day = String(now.getDate()).padStart(2, '0');

const formattedDate = `${day}-${month}-${year}`; 
// Result: "2026-05-08"
// Use a dot (.) for classes, just like in CSS
document.querySelector('.date-picker').innerHTML = formattedDate;
  const ctx = document.getElementById("myChart").getContext("2d");
  const doughCtx = document.getElementById("myDough").getContext("2d");
  let samp_inc = [8598, 6019, 5451, 4628, 70, 70, 70, 70, 70, 70, 70],  samp_exp = [7030, 5903, 8921, 7636, 70, 70, 70, 70, 70, 70, 70], i = 0, j = 0;
   areaChart = new Chart(ctx, {
    type: 'line', // Area charts are technically 'line' charts in Chart.js
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: 'Incomes',
        data: (user_data.monthly_inc_summary || []).map( val => {return val === 0 ? samp_inc[i++] : val;}), // Example 
        fill: true,
        backgroundColor: 'rgba(22, 163, 74, 0.5)', // Light green fill
        borderColor: '#00ff00',      // Thinner, softer green border
        
        // --- THE CLEANUP FIXES ---
        borderWidth: 2.5,     // Makes the line less bold/thick
        pointRadius: 0,       // REMOVES the dots (points) entirely
        pointHitRadius: 10,   // Keeps the tooltip working when you hover
        tension: 0.4          // Keeps the smooth curve
      },
      {
        label: 'Expenses',
        data: (user_data.monthly_exp_summary || []).map( val => {return val === 0 ? samp_exp[j++] : val;}), // Example 
                fill: true,
                backgroundColor: 'rgba(239, 68, 68, 0.5)', // Light red fill
                borderColor: '#ff0000',      // Thinner, softer red border
                
                // --- THE CLEANUP FIXES ---
                borderWidth: 2.5,     // Makes the line less bold
                pointRadius: 0,       // REMOVES the dots
                pointHitRadius: 10,   // Keeps hover interaction
                tension: 0.4
      }
      ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false, // Ensures it fits your new smaller card layout
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)' // Subtle grid for dark mode
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        },
        plugins: {
            legend: {
            display: true,
            position: 'top',
            align: 'end', // This shifts the legend to the right end
            labels: {
                boxWidth: 14, // Smaller colored boxes for a cleaner look
                padding: 20,  // Space between legends and the chart
                lineWidth: 0,
                color: '#616569', // Matches your dark mode text
                font: {
                    size: 14,
                    family: "'Poppins', sans-serif",
                    weight: "bold"
                }
            }
        },
      }
    }
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
            '#1e90ff',
            "#89abe3",
            "#8931ef",
            "#0057e9",
          ],
          borderWidth: 0,
          hoverBorderWidth: 0
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
      transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      updateDashboard(1);          
      updateTransactionsTable();   
      closeModal("incomeModal");
      showNotification("Income added successfully", "income");

      const dateObj = new Date(dateInput);
      const monthIndex = dateObj.getMonth();
      
      if (areaChart) {
        areaChart.data.datasets[0].data[monthIndex] += amt;
        areaChart.update();
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

      transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      updateDashboard(0);
      updateTransactionsTable();
      closeModal("expenseModal");
      showNotification("Expense added successfully", "expense");

      const dateObj = new Date(dateInput);
      const monthIndex = dateObj.getMonth();
      
      // FIX: Use explicit index 0 for Expenses instead of undefined variable
      if (areaChart) {
          areaChart.data.datasets[1].data[monthIndex] += amt; 
          areaChart.update();
      }

      if (doughnutChart) {
        // Check the chart's actual labels, not the external categoryData object
        const chartLabels = doughnutChart.data.labels;
        const catIndex = chartLabels.indexOf(cat);

        if (catIndex !== -1) {
            // Update existing category
            doughnutChart.data.datasets[0].data[catIndex] += amt;
        } else {
            // Add brand new category
            doughnutChart.data.labels.push(cat);
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



// Data Analysis

// --- DATA INSIGHTS & ACCORDION ANALYSIS ENGINE (STYLED & SIMPLIFIED) ---
function generateFinancialInsights() {
    const p1 = document.querySelector('#accordion_button_1 + .accordion_content p');
    const p2 = document.querySelector('#accordion_button_2 + .accordion_content p');
    const p4 = document.querySelector('#accordion_button_4 + .accordion_content p');
    
    if (!transactions || !transactions.length) {
        const noDataMsg = `<span class="insight-empty">No transactions added yet. Start adding income or expenses to see your insights!</span>`;
        if (p1) p1.innerHTML = noDataMsg;
        if (p2) p2.innerHTML = noDataMsg;
        if (p4) p4.innerHTML = noDataMsg;
        return;
    }

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);

    const thisWeekTrans = transactions.filter(t => t.date && new Date(t.date) >= sevenDaysAgo && new Date(t.date) <= today);
    const lastWeekTrans = transactions.filter(t => t.date && new Date(t.date) >= fourteenDaysAgo && new Date(t.date) < sevenDaysAgo);

    // =================================================================
    // ACCORDION PANEL 1: Top Income vs Top Expense
    // =================================================================
    let totalIncomeThisWeek = 0, totalExpenseThisWeek = 0;
    let expenseCategories = {}, incomeCategories = {};

    thisWeekTrans.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') {
            totalIncomeThisWeek += amt;
            incomeCategories[t.category_name] = (incomeCategories[t.category_name] || 0) + amt;
        } else {
            totalExpenseThisWeek += amt;
            expenseCategories[t.category_name] = (expenseCategories[t.category_name] || 0) + amt;
        }
    });

    const topIncomeArray = Object.entries(incomeCategories).sort((a, b) => b[1] - a[1]);
    const topExpenseArray = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1]);

    let panel1Html = '<div class="insight-wrapper">';
    
    if (topIncomeArray.length > 0) {
        panel1Html += `
            <div class="insight-line">
                Your highest earning category was <span class="insight-badge badge-income">${topIncomeArray[0][0]}</span>, 
                bringing in <span class="text-highlight income-color">₹${topIncomeArray[0][1].toLocaleString('en-IN')}</span>.
            </div>`;
    } else {
        panel1Html += `<div class="insight-line text-muted">No income recorded this week.</div>`;
    }

    if (topExpenseArray.length > 0) {
        panel1Html += `
            <div class="insight-line" style="margin-top: 10px;">
                Your biggest spending category was <span class="insight-badge badge-expense">${topExpenseArray[0][0]}</span>, 
                costing you <span class="text-highlight expense-color">₹${topExpenseArray[0][1].toLocaleString('en-IN')}</span>.
            </div>`;
    } else {
        panel1Html += `<div class="insight-line text-muted" style="margin-top: 10px;">No expenses recorded this week.</div>`;
    }
    panel1Html += '</div>';
    
    if (p1) p1.innerHTML = panel1Html;

    // =================================================================
    // ACCORDION PANEL 2: Insight on Weekly Expenditures
    // =================================================================
    let totalExpenseLastWeek = 0;
    
    lastWeekTrans.forEach(t => {
        if (t.type === 'expense') {
            totalExpenseLastWeek += parseFloat(t.amount) || 0;
        }
    });

    let panel2Html = `
        <div class="insight-wrapper">
            <div class="insight-line">You spent <span class="text-highlight font-medium">₹${totalExpenseThisWeek.toLocaleString('en-IN')}</span> this week.</div>`;

    if (totalExpenseLastWeek > 0) {
        const difference = totalExpenseThisWeek - totalExpenseLastWeek;
        const percentageChange = Math.abs(Math.round((difference / totalExpenseLastWeek) * 100));
        
        if (difference > 0) {
            panel2Html += `
                <div class="insight-status status-red-box">
                    That is <span class="expense-color font-bold">₹${difference.toLocaleString('en-IN')} (${percentageChange}%) more</span> than last week (₹${totalExpenseLastWeek.toLocaleString('en-IN')}).
                </div>`;
        } else if (difference < 0) {
            panel2Html += `
                <div class="insight-status status-green-box">
                    That is <span class="income-color font-bold">₹${Math.abs(difference).toLocaleString('en-IN')} (${percentageChange}%) less</span> than last week (₹${totalExpenseLastWeek.toLocaleString('en-IN')}). Good job cutting back!
                </div>`;
        } else {
            panel2Html += `<div class="insight-status status-gray-box">This is exactly the same amount you spent last week!</div>`;
        }
    } else {
        panel2Html += `<div class="insight-status status-gray-box">Not enough data from the previous week to make a comparison yet.</div>`;
    }
    panel2Html += '</div>';
    
    if (p2) p2.innerHTML = panel2Html;

    // =================================================================
    // ACCORDION PANEL 3: Insight on Savings
    // =================================================================
    let netSavings = totalIncomeThisWeek - totalExpenseThisWeek;
    let savingsPercentage = totalIncomeThisWeek > 0 ? ((netSavings / totalIncomeThisWeek) * 100).toFixed(0) : 0;

    let panel4Html = '<div class="insight-wrapper">';

    if (totalIncomeThisWeek === 0 && totalExpenseThisWeek === 0) {
        panel4Html += `<div class="insight-line text-muted">No financial activity logged in the past 7 days.</div>`;
    } else if (netSavings > 0) {
        panel4Html += `
            <div class="insight-status status-green-box" style="font-size: 1rem; margin-bottom: 8px;">
                🎉 You are on the safer side!
            </div>
            <div class="insight-line">
                You saved <span class="income-color font-bold">₹${netSavings.toLocaleString('en-IN')}</span> this week. 
                That means you kept <span class="text-highlight font-medium">${savingsPercentage}%</span> of what you earned. Keep it up!
            </div>
        `;
    } else if (netSavings === 0) {
        panel4Html += `
            <div class="insight-status status-orange-box" style="font-size: 1rem; margin-bottom: 8px;">
                ⚖️ Transactional Equilibrium.
            </div>
            <div class="insight-line">
                You spent exactly what you earned this week. Try to spend a bit less next week to ensure gradual wealth.
            </div>
        `;
    } else {
        panel4Html += `
            <div class="insight-status status-red-box" style="font-size: 0.9rem; margin-bottom: 8px;">
                ⚠️ You have spent more than you earned.
            </div>
            <div class="insight-line">
                You went over budget by <span class="expense-color font-bold">₹${Math.abs(netSavings).toLocaleString('en-IN')}</span> this week. 
                Take a look at your biggest spending category above to eradicate your spending inertia.
            </div>
        `;
    }
    panel4Html += '</div>';
    
    if (p4) p4.innerHTML = panel4Html;
}

// At the bottom of script.js
document.addEventListener("DOMContentLoaded", () => {
    // 1. Setup Event Listeners with Null Checks
    const unified = document.getElementById('filterUnified');
    const reset = document.getElementById("resetFilters");

    if (unified) unified.addEventListener('change', updateTransactionsTable);
    if (reset) {
        reset.addEventListener('click', () => {
            if (unified) unified.value = 'all';
            updateTransactionsTable();
        });
    }

    // 2. Load the Data
    updateTransactionsTable();
    updateDashboard(0); // This fills the 0.00 cards
    generateFinancialInsights();
});