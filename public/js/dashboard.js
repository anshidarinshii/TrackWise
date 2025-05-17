document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    checkAuth();

    // Initialize event listeners
    initializeEventListeners();

    // Load initial data
    loadDashboardData();
});

function checkAuth() {
    fetch('/api/check-auth')
        .then(response => {
            if (!response.ok) {
                window.location.href = '/index.html';
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('userName').textContent = `Welcome, ${data.name}`;
        })
        .catch(() => {
            window.location.href = '/index.html';
        });
}

function initializeEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Transaction buttons
    document.getElementById('addIncomeBtn').addEventListener('click', () => showTransactionModal('income'));
    document.getElementById('addExpenseBtn').addEventListener('click', () => showTransactionModal('expense'));
    document.getElementById('viewTransactionsBtn').addEventListener('click', showTransactionsModal);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        });
    });

    // Transaction form
    document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
}

function handleLogout() {
    fetch('/api/logout', {
        method: 'POST'
    })
    .then(() => {
        window.location.href = '/index.html';
    })
    .catch(error => {
        console.error('Logout failed:', error);
    });
}

function showTransactionModal(type) {
    const modal = document.getElementById('transactionModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('transactionForm');
    
    modalTitle.textContent = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    form.dataset.type = type;
    
    // Set current date and time
    const now = new Date();
    const dateTimeString = now.toISOString().slice(0, 16);
    document.getElementById('date').value = dateTimeString;
    
    modal.classList.add('show');
}

function showTransactionsModal() {
    const modal = document.getElementById('transactionsModal');
    modal.classList.add('show');
    loadTransactions();
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const type = form.dataset.type;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;

    fetch('/api/transactions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type,
            amount: parseFloat(amount),
            description,
            date
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('transactionModal').classList.remove('show');
            form.reset();
            loadDashboardData();
        } else {
            alert('Failed to add transaction');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while adding the transaction');
    });
}

function loadDashboardData() {
    fetch('/api/dashboard')
        .then(response => response.json())
        .then(data => {
            document.getElementById('totalBalance').textContent = formatCurrency(data.balance);
            document.getElementById('totalIncome').textContent = formatCurrency(data.income);
            document.getElementById('totalExpenses').textContent = formatCurrency(data.expenses);
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
        });
}

function loadTransactions() {
    fetch('/api/transactions')
        .then(response => response.json())
        .then(transactions => {
            const tbody = document.querySelector('#transactionsTable tbody');
            tbody.innerHTML = '';
            
            transactions.forEach(transaction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${transaction.type}</td>
                    <td>${transaction.description}</td>
                    <td>${formatCurrency(transaction.amount)}</td>
                    <td>${formatDate(transaction.date)}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading transactions:', error);
        });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
} 