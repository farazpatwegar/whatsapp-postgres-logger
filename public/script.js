document.addEventListener('DOMContentLoaded', function() {
  const messagesList = document.getElementById('messages-list');
  const refreshBtn = document.getElementById('refresh-btn');
  const clearBtn = document.getElementById('clear-btn');
  const loadMoreBtn = document.getElementById('load-more');
  const searchInput = document.getElementById('search-input');
  const filterSelect = document.getElementById('filter-select');
  const loadingElement = document.getElementById('loading');
  const whatsappStatus = document.getElementById('whatsapp-status');
  const messageCount = document.getElementById('message-count');
  const qrContainer = document.getElementById('qr-container');
  const qrCodeElement = document.getElementById('qr-code');
  
  let offset = 0;
  const limit = 20;
  let allMessages = [];
  let filteredMessages = [];
  
  // Initialize the application
  async function init() {
    await checkStatus();
    await loadStats();
    await loadMessages();
    
    // Set up periodic status checks
    setInterval(checkStatus, 10000);
    setInterval(loadStats, 30000);
  }
  
  // Check system status
  async function checkStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      if (data.success) {
        const status = data.data.whatsappStatus;
        whatsappStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        
        if (status === 'waiting' && data.data.qrCode) {
          showQRCode(data.data.qrCode);
        } else {
          hideQRCode();
        }
        
        // Update status badge color
        whatsappStatus.className = 'status-badge ' + (
          status === 'authenticated' ? 'success' : 
          status === 'waiting' ? 'warning' : 'error'
        );
      }
    } catch (error) {
      console.error('Error checking status:', error);
      whatsappStatus.textContent = 'Error';
      whatsappStatus.className = 'status-badge error';
    }
  }
  
  // Load message statistics
  async function loadStats() {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      
      if (data.success) {
        messageCount.textContent = data.data.totalMessages.toLocaleString();
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }
  
  // Show QR code for authentication
  function showQRCode(qrData) {
    qrContainer.style.display = 'block';
    qrCodeElement.innerHTML = '';
    
    const qr = qrcode(0, 'M');
    qr.addData(qrData);
    qr.make();
    qrCodeElement.innerHTML = qr.createSvgTag({
      scalable: true,
      margin: 2,
      color: '#25d366'
    });
  }
  
  // Hide QR code
  function hideQRCode() {
    qrContainer.style.display = 'none';
  }
  
  // Load messages from server
  async function loadMessages() {
    try {
      loadingElement.style.display = 'block';
      
      const response = await fetch(`/api/messages?limit=${limit}&offset=${offset}`);
      const data = await response.json();
      
      if (data.success) {
        if (offset === 0) {
          allMessages = data.data;
        } else {
          allMessages = [...allMessages, ...data.data];
        }
        
        filterMessages();
        
        // Show/hide load more button
        if (data.data.length === limit) {
          loadMoreBtn.style.display = 'block';
        } else {
          loadMoreBtn.style.display = 'none';
        }
        
        offset += limit;
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      messagesList.innerHTML = '<div class="message">Error loading messages. Please try again.</div>';
    } finally {
      loadingElement.style.display = 'none';
    }
  }
  
  // Filter messages based on search and filter criteria
  function filterMessages() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;
    
    filteredMessages = allMessages.filter(message => {
      // Apply search filter
      const matchesSearch = searchTerm === '' || 
        message.message.toLowerCase().includes(searchTerm) ||
        message.sender_name.toLowerCase().includes(searchTerm) ||
        (message.group_name && message.group_name.toLowerCase().includes(searchTerm));
      
      // Apply type filter
      let matchesFilter = true;
      if (filterValue === 'group') {
        matchesFilter = message.is_group;
      } else if (filterValue === 'individual') {
        matchesFilter = !message.is_group;
      }
      
      return matchesSearch && matchesFilter;
    });
    
    renderMessages();
  }
  
  // Render messages to the UI
  function renderMessages() {
    if (filteredMessages.length === 0) {
      messagesList.innerHTML = '<div class="message">No messages found.</div>';
      return;
    }
    
    messagesList.innerHTML = '';
    filteredMessages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = 'message';
      
      const date = new Date(message.timestamp * 1000);
      const formattedDate = date.toLocaleString();
      
      messageElement.innerHTML = `
        <div class="message-header">
          <div>
            <span class="sender">${escapeHtml(message.sender_name)}</span>
            ${message.is_group ? `<span class="group-badge">Group: ${escapeHtml(message.group_name || 'Unknown')}</span>` : ''}
          </div>
          <div class="timestamp">${formattedDate}</div>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
      `;
      
      messagesList.appendChild(messageElement);
    });
  }
  
  // Utility function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Event listeners
  refreshBtn.addEventListener('click', () => {
    offset = 0;
    loadMessages();
  });
  
  clearBtn.addEventListener('click', () => {
    messagesList.innerHTML = '';
    allMessages = [];
    filteredMessages = [];
    offset = 0;
  });
  
  loadMoreBtn.addEventListener('click', loadMessages);
  
  searchInput.addEventListener('input', filterMessages);
  filterSelect.addEventListener('change', filterMessages);
  
  // Initialize the application
  init();
});