/**
 * BI Dashboard Analytics Controller
 * Handles data fetching, processing, filtering, chart rendering, and interactions.
 */

// Application State
const state = {
  transactions: [],
  filteredTransactions: [],
  filters: {
    search: '',
    category: 'all',
    status: 'all',
    timeframe: 'all' // 'all', '7d', '30d', 'ytd'
  },
  pagination: {
    currentPage: 1,
    pageSize: 10
  },
  sorting: {
    field: 'timestamp',
    direction: 'desc' // 'asc' or 'desc'
  },
  charts: {
    trend: null,
    category: null,
    payment: null
  },
  theme: localStorage.getItem('dashboard-theme') || 'dark'
};

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchData();
  setupEventListeners();
});

/* ==========================================================================
   Theme Management
   ========================================================================== */

function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  if (state.theme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.innerHTML = '<i class="lucide-moon"></i>';
  } else {
    document.body.classList.remove('light-theme');
    themeToggle.innerHTML = '<i class="lucide-sun"></i>';
  }
}

function toggleTheme() {
  const themeToggle = document.getElementById('themeToggle');
  if (document.body.classList.contains('light-theme')) {
    document.body.classList.remove('light-theme');
    state.theme = 'dark';
    themeToggle.innerHTML = '<i class="lucide-sun"></i>';
  } else {
    document.body.classList.add('light-theme');
    state.theme = 'light';
    themeToggle.innerHTML = '<i class="lucide-moon"></i>';
  }
  localStorage.setItem('dashboard-theme', state.theme);
  
  // Re-render charts to adjust grid/text colors for theme
  renderCharts();
  
  // Refresh icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

/* ==========================================================================
   Data Fetching & Pipeline
   ========================================================================== */

async function fetchData() {
  try {
    const response = await fetch('./data/transactions.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    state.transactions = await response.json();
    
    // Initial pipeline run
    applyDataPipeline();
  } catch (error) {
    console.error('Failed to load transaction data:', error);
    showNotification('Error loading transactions data. Please run in a local server.', 'danger');
  }
}

function applyDataPipeline() {
  // 1. Filter
  filterData();
  
  // 2. Sort
  sortData();
  
  // 3. Compute Metrics
  computeKPIs();
  
  // 4. Render Visuals
  renderCharts();
  
  // 5. Render Table
  state.pagination.currentPage = 1; // Reset to page 1 on filter/sort change
  renderTable();
}

/* ==========================================================================
   Filtering & Sorting Engine
   ========================================================================== */

function filterData() {
  const { search, category, status, timeframe } = state.filters;
  
  state.filteredTransactions = state.transactions.filter(txn => {
    // Search filter (ID or Customer name)
    const matchesSearch = txn.id.toLowerCase().includes(search.toLowerCase()) || 
                          txn.customer.toLowerCase().includes(search.toLowerCase());
    
    // Category filter
    const matchesCategory = category === 'all' || txn.category === category;
    
    // Status filter
    const matchesStatus = status === 'all' || txn.status === status;
    
    // Timeframe filter
    let matchesTimeframe = true;
    if (timeframe !== 'all') {
      const txnDate = new Date(txn.timestamp);
      const now = new Date();
      
      // Calculate date thresholds
      const diffTime = Math.abs(now - txnDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (timeframe === '7d') {
        matchesTimeframe = diffDays <= 7;
      } else if (timeframe === '30d') {
        matchesTimeframe = diffDays <= 30;
      } else if (timeframe === 'ytd') {
        // Year to date (same calendar year)
        matchesTimeframe = txnDate.getFullYear() === now.getFullYear();
      }
    }
    
    return matchesSearch && matchesCategory && matchesStatus && matchesTimeframe;
  });
}

function sortData() {
  const { field, direction } = state.sorting;
  
  state.filteredTransactions.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];
    
    // Handle date comparisons
    if (field === 'timestamp') {
      valA = new Date(valA);
      valB = new Date(valB);
    }
    
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/* ==========================================================================
   Metric Computations & Dynamic Counters
   ========================================================================== */

function computeKPIs() {
  const txns = state.filteredTransactions;
  const totalCount = txns.length;
  
  // Calculate completed metrics
  const completedTxns = txns.filter(t => t.status === 'Completed');
  const revenue = completedTxns.reduce((sum, t) => sum + t.amount, 0);
  const aov = completedTxns.length > 0 ? revenue / completedTxns.length : 0;
  
  // Success rate computation (Completed vs total attempted)
  const nonRefundedAttempted = txns.filter(t => t.status !== 'Refunded');
  const successCount = nonRefundedAttempted.filter(t => t.status === 'Completed').length;
  const successRate = nonRefundedAttempted.length > 0 ? (successCount / nonRefundedAttempted.length) * 100 : 0;
  
  // Update UI Elements with smooth counting animations
  animateCounter('revenueKPI', revenue, true);
  animateCounter('transactionsKPI', totalCount, false);
  animateCounter('aovKPI', aov, true);
  animateCounter('successKPI', successRate, false, '%');
}

function animateCounter(elementId, targetValue, isCurrency, suffix = '') {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const duration = 800; // ms
  const startTimestamp = performance.now();
  const startValue = 0;
  
  function step(now) {
    const elapsed = now - startTimestamp;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (targetValue - startValue) * easeProgress;
    
    if (isCurrency) {
      element.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(currentValue);
    } else {
      element.textContent = currentValue.toFixed(suffix ? 1 : 0) + suffix;
    }
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }
  
  window.requestAnimationFrame(step);
}

/* ==========================================================================
   Chart Visualizations (Chart.js)
   ========================================================================== */

function getChartThemeColors() {
  const isLight = document.body.classList.contains('light-theme');
  return {
    text: isLight ? '#475569' : '#94a3b8',
    grid: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
    tooltipBg: isLight ? '#ffffff' : '#0f1420',
    tooltipBorder: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    tooltipText: isLight ? '#0f172a' : '#f8fafc'
  };
}

function renderCharts() {
  const colors = getChartThemeColors();
  const txns = state.filteredTransactions;
  
  renderRevenueTrendChart(txns, colors);
  renderCategoryBreakdownChart(txns);
  renderPaymentMethodsChart(txns, colors);
}

function renderRevenueTrendChart(txns, colors) {
  // Aggregate sales by date (Completed transactions)
  const salesByDate = {};
  
  // Initialize last 15 days or range dates
  txns.filter(t => t.status === 'Completed').forEach(t => {
    const dateStr = t.timestamp.substring(0, 10); // YYYY-MM-DD
    salesByDate[dateStr] = (salesByDate[dateStr] || 0) + t.amount;
  });
  
  // Sort dates
  const sortedDates = Object.keys(salesByDate).sort();
  const salesValues = sortedDates.map(d => salesByDate[d]);
  
  // Format labels nicely (e.g., "Jun 12")
  const dateLabels = sortedDates.map(d => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const ctx = document.getElementById('revenueTrendChart').getContext('2d');
  
  if (state.charts.trend) {
    state.charts.trend.destroy();
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');

  state.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dateLabels.length > 0 ? dateLabels : ['No Data'],
      datasets: [{
        label: 'Daily Revenue',
        data: salesValues.length > 0 ? salesValues : [0],
        borderColor: '#6366f1',
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: gradient,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return 'Revenue: ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.raw);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.text, font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            font: { family: 'Inter', size: 11 },
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      }
    }
  });
}

function renderCategoryBreakdownChart(txns) {
  // Aggregate sales by Category
  const categorySales = {};
  txns.forEach(t => {
    categorySales[t.category] = (categorySales[t.category] || 0) + (t.status === 'Completed' ? t.amount : 0);
  });
  
  const labels = Object.keys(categorySales);
  const data = Object.values(categorySales);
  
  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  if (state.charts.category) {
    state.charts.category.destroy();
  }

  // Generate pleasant palette
  const backgroundColors = [
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6'  // Purple
  ];

  state.charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: data.length > 0 ? backgroundColors.slice(0, labels.length) : ['rgba(128,128,128,0.1)'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: getChartThemeColors().text,
            font: { family: 'Inter', size: 11, weight: '500' },
            boxWidth: 10,
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: getChartThemeColors().tooltipBg,
          borderColor: getChartThemeColors().tooltipBorder,
          borderWidth: 1,
          titleColor: getChartThemeColors().tooltipText,
          bodyColor: getChartThemeColors().tooltipText,
          padding: 12,
          callbacks: {
            label: function(context) {
              if (data.length === 0) return ' No transactions';
              const label = context.label || '';
              const val = context.raw || 0;
              return ` ${label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)}`;
            }
          }
        }
      }
    }
  });
}

function renderPaymentMethodsChart(txns, colors) {
  // Count payment method frequency
  const paymentCounts = {};
  txns.forEach(t => {
    paymentCounts[t.paymentMethod] = (paymentCounts[t.paymentMethod] || 0) + 1;
  });
  
  // Sort payment methods by popularity
  const sortedMethods = Object.keys(paymentCounts).sort((a, b) => paymentCounts[b] - paymentCounts[a]);
  const counts = sortedMethods.map(m => paymentCounts[m]);

  const ctx = document.getElementById('paymentChart').getContext('2d');
  
  if (state.charts.payment) {
    state.charts.payment.destroy();
  }

  state.charts.payment = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedMethods.length > 0 ? sortedMethods : ['No Data'],
      datasets: [{
        data: counts.length > 0 ? counts : [0],
        backgroundColor: 'rgba(6, 182, 212, 0.75)',
        hoverBackgroundColor: '#06b6d4',
        borderRadius: 6,
        barThickness: 16
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: { color: colors.text, font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: colors.text, font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}

/* ==========================================================================
   Data Table & Pagination Rendering
   ========================================================================== */

function renderTable() {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;
  
  const txns = state.filteredTransactions;
  const { currentPage, pageSize } = state.pagination;
  
  // Clear table
  tableBody.innerHTML = '';
  
  if (txns.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
          No transactions match the selected filters.
        </td>
      </tr>
    `;
    updatePaginationControls(0);
    return;
  }
  
  // Pagination Range slice
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, txns.length);
  const paginatedItems = txns.slice(startIndex, endIndex);
  
  paginatedItems.forEach(txn => {
    const row = document.createElement('tr');
    
    // Status badges class mapping
    let badgeClass = 'badge-pending';
    if (txn.status === 'Completed') badgeClass = 'badge-completed';
    else if (txn.status === 'Failed') badgeClass = 'badge-failed';
    else if (txn.status === 'Refunded') badgeClass = 'badge-refunded';
    
    // Format timestamp nicely
    const date = new Date(txn.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }) + ', ' + date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    
    // Format amount
    const formattedAmount = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(txn.amount);
    
    row.innerHTML = `
      <td style="font-family: monospace; font-weight: 600; color: var(--accent);">${txn.id}</td>
      <td style="color: var(--text-muted);">${formattedDate}</td>
      <td>${txn.customer}</td>
      <td><span style="opacity: 0.9;">${txn.category}</span></td>
      <td style="font-weight: 700;">${formattedAmount}</td>
      <td>
        <span class="badge ${badgeClass}">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
          ${txn.status}
        </span>
      </td>
      <td style="color: var(--text-muted); font-size: 0.88rem;">${txn.paymentMethod}</td>
    `;
    
    tableBody.appendChild(row);
  });
  
  updatePaginationControls(txns.length);
}

function updatePaginationControls(totalItems) {
  const { currentPage, pageSize } = state.pagination;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  // Update range information text
  document.getElementById('paginationInfo').textContent = 
    `Showing ${startItem} to ${endItem} of ${totalItems} entries`;
  
  // Enable/disable page control buttons
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function setPage(direction) {
  const totalPages = Math.ceil(state.filteredTransactions.length / state.pagination.pageSize);
  
  if (direction === 'prev' && state.pagination.currentPage > 1) {
    state.pagination.currentPage--;
  } else if (direction === 'next' && state.pagination.currentPage < totalPages) {
    state.pagination.currentPage++;
  }
  
  renderTable();
}

/* ==========================================================================
   Export Feature (CSV Generation)
   ========================================================================== */

function exportCSV() {
  const txns = state.filteredTransactions;
  if (txns.length === 0) {
    showNotification('No data to export.', 'warning');
    return;
  }
  
  // Headers
  const headers = ['Transaction ID', 'Timestamp', 'Customer', 'Category', 'Amount ($)', 'Status', 'Payment Method'];
  
  // Map rows
  const rows = txns.map(txn => [
    txn.id,
    txn.timestamp,
    `"${txn.customer.replace(/"/g, '""')}"`, // escape quotes
    txn.category,
    txn.amount,
    txn.status,
    txn.paymentMethod
  ]);
  
  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const timestampStr = new Date().toISOString().substring(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `mis_bi_export_${timestampStr}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification(`Exported ${txns.length} records successfully!`, 'success');
}

/* ==========================================================================
   UI Event Bindings & Utilities
   ========================================================================== */

function setupEventListeners() {
  // Theme switch
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // Search input with debounce support
  let searchDebounceTimeout;
  document.getElementById('searchQuery').addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      state.filters.search = e.target.value;
      applyDataPipeline();
    }, 250);
  });
  
  // Select Dropdowns
  document.getElementById('categoryFilter').addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    applyDataPipeline();
  });
  
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    applyDataPipeline();
  });
  
  document.getElementById('timeframeFilter').addEventListener('change', (e) => {
    state.filters.timeframe = e.target.value;
    applyDataPipeline();
  });
  
  // Sortable table headers
  const headers = document.querySelectorAll('.custom-table th[data-sort]');
  headers.forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort');
      
      if (state.sorting.field === field) {
        // Toggle direction
        state.sorting.direction = state.sorting.direction === 'asc' ? 'desc' : 'asc';
      } else {
        // New sort field
        state.sorting.field = field;
        state.sorting.direction = 'asc';
      }
      
      // Update sort arrow styling
      headers.forEach(h => {
        h.innerHTML = h.textContent.trim(); // Reset all headers to text only
      });
      
      const arrow = state.sorting.direction === 'asc' ? ' &uarr;' : ' &darr;';
      header.innerHTML = header.textContent.trim() + arrow;
      
      applyDataPipeline();
    });
  });
  
  // Pagination Buttons
  document.getElementById('prevPageBtn').addEventListener('click', () => setPage('prev'));
  document.getElementById('nextPageBtn').addEventListener('click', () => setPage('next'));
  
  // CSV Export Button
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  
  // Mobile Sidebar Drawer
  const mobileToggle = document.getElementById('mobileSidebarToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      const isOpen = sidebar.classList.contains('open');
      mobileToggle.innerHTML = isOpen ? '<i class="lucide-x"></i>' : '<i class="lucide-menu"></i>';
      if (window.lucide) lucide.createIcons();
    });
  }
}

// Simple dynamic alerts
function showNotification(message, type = 'info') {
  // Create toast notification banner
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '24px';
  notification.style.right = '24px';
  notification.style.padding = '12px 24px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  notification.style.zIndex = '1000';
  notification.style.fontFamily = 'Inter, sans-serif';
  notification.style.fontWeight = '600';
  notification.style.fontSize = '0.9rem';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '8px';
  notification.style.transition = 'all 0.3s ease';
  notification.style.transform = 'translateY(100px)';
  notification.style.opacity = '0';
  
  let bg = '#6366f1';
  let color = '#ffffff';
  if (type === 'success') bg = '#10b981';
  else if (type === 'warning') bg = '#f59e0b';
  else if (type === 'danger') bg = '#ef4444';
  
  notification.style.backgroundColor = bg;
  notification.style.color = color;
  notification.innerHTML = message;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  }, 10);
  
  // Animate out
  setTimeout(() => {
    notification.style.transform = 'translateY(20px)';
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}
