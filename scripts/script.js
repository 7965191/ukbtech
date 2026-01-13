 // File Upload Handling
 let selectedFiles = [];
 document.getElementById('fileInput').addEventListener('change', function (e) {
     handleFiles(e.target.files);
 });
 function handleFileDrop(e) {
     e.preventDefault();
     e.currentTarget.classList.remove('drag-over');
     const files = e.dataTransfer.files;
     handleFiles(files);
 }
 function handleFiles(files) {
     Array.from(files).forEach(file => {
         if (file.size > 10 * 1024 * 1024) {
             alert('File ' + file.name + ' is too large. Maximum size is 10 MB.');
             return;
         }
         const validExtensions = ['.pdf', '.dxf', '.step', '.stp', '.dwg'];
         const ext = '.' + file.name.split('.').pop().toLowerCase();
         if (!validExtensions.includes(ext)) {
             alert('File ' + file.name + ' has invalid format. Allowed: PDF, DXF, STEP, DWG');
             return;
         }
         if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
             selectedFiles.push(file);
             updateFileList();
         }
     });
 }
 function updateFileList() {
     const fileListEl = document.getElementById('fileList');
     if (selectedFiles.length === 0) {
         fileListEl.innerHTML = '';
         return;
     }
     fileListEl.innerHTML = selectedFiles.map((file, index) => `
         <div class="file-item">
             <div class="file-item-name">
                 <i class="ph-bold ph-file"></i>
                 <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
             </div>
             <span class="file-item-remove" onclick="removeFile(${index})">
                 <i class="ph-bold ph-x"></i>
             </span>
         </div>
     `).join('');
 }
 function removeFile(index) {
     selectedFiles.splice(index, 1);
     updateFileList();
 }
 // Telegram Bot Configuration
 const TELEGRAM_BOT_TOKEN = '8516565846:AAFePvM0-eKGRkk-qKa5jKloLRpJj58KZuo';
 const TELEGRAM_CHAT_ID = '756193681';
 const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

 async function handleFormSubmit(e) {
     e.preventDefault();
     const form = e.target;
     const submitButton = form.querySelector('button[type="submit"]');
     const originalButtonText = submitButton.innerHTML;
     
     // Disable button and show loading
     submitButton.disabled = true;
     submitButton.innerHTML = 'Відправка...';

     try {
         const name = form.querySelector('input[name="name"]').value;
         const contact = form.querySelector('input[name="contact"]').value;
         const message = form.querySelector('textarea[name="message"]').value;

         // Format message for Telegram
         const telegramMessage = `🆕 НОВИЙ ЗАПИТ З САЙТУ UKBTECH\n\n` +
             `👤 <b>Ім'я:</b> ${escapeHtml(name)}\n` +
             `📞 <b>Контакт:</b> ${escapeHtml(contact)}\n` +
             `💬 <b>Повідомлення:</b>\n${escapeHtml(message)}\n\n` +
             `${selectedFiles.length > 0 ? `📎 <b>Файли:</b> ${selectedFiles.length} файл(ів)\n` : ''}` +
             `⏰ <b>Час:</b> ${new Date().toLocaleString('uk-UA')}`;

         // Send text message to Telegram
         const messageResponse = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify({
                 chat_id: TELEGRAM_CHAT_ID,
                 text: telegramMessage,
                 parse_mode: 'HTML'
             })
         });

         const messageResult = await messageResponse.json();

         if (!messageResult.ok) {
             throw new Error(messageResult.description || 'Failed to send message');
         }

         // Send files if any
         if (selectedFiles.length > 0) {
             for (let i = 0; i < selectedFiles.length; i++) {
                 const file = selectedFiles[i];
                 await sendFileToTelegram(file, name, contact, i + 1, selectedFiles.length);
             }
         }

         // Success
         alert('✅ Дякуємо! Ваш запит відправлено. Ми зв\'яжемося з вами найближчим часом.');
         form.reset();
     selectedFiles = [];
     updateFileList();
         
     } catch (error) {
         console.error('Error sending to Telegram:', error);
         alert('❌ Помилка відправки. Будь ласка, спробуйте ще раз або зв\'яжіться з нами іншим способом.');
     } finally {
         // Re-enable button
         submitButton.disabled = false;
         submitButton.innerHTML = originalButtonText;
     }
 }

 function escapeHtml(text) {
     const map = {
         '&': '&amp;',
         '<': '&lt;',
         '>': '&gt;',
         '"': '&quot;',
         "'": '&#039;'
     };
     return text.replace(/[&<>"']/g, m => map[m]);
 }

 async function sendFileToTelegram(file, senderName, senderContact, fileNumber, totalFiles) {
     try {
         const formData = new FormData();
         formData.append('chat_id', TELEGRAM_CHAT_ID);
         formData.append('document', file, file.name);
         formData.append('caption', `📎 Файл ${fileNumber}/${totalFiles} від ${senderName} (${senderContact})\n📄 ${file.name} (${formatFileSize(file.size)})`);

         const response = await fetch(`${TELEGRAM_API_URL}/sendDocument`, {
             method: 'POST',
             body: formData
         });

         const result = await response.json();
         
         if (!result.ok) {
             console.warn(`Failed to send file ${file.name}:`, result.description);
             // If file sending fails due to CORS, send file info as text message
             await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({
                     chat_id: TELEGRAM_CHAT_ID,
                     text: `📎 Файл ${fileNumber}/${totalFiles}: ${file.name} (${formatFileSize(file.size)})\n❌ Файл не вдалося відправити через технічні обмеження.`
                 })
             });
         }
     } catch (error) {
         console.error(`Error sending file ${file.name}:`, error);
         // Fallback: send file info as text
         try {
             await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({
                     chat_id: TELEGRAM_CHAT_ID,
                     text: `📎 Файл ${fileNumber}/${totalFiles}: ${file.name} (${formatFileSize(file.size)})\n⚠️ Файл не вдалося відправити. Розмір: ${formatFileSize(file.size)}, Тип: ${file.type || 'невідомий'}`
                 })
             });
         } catch (fallbackError) {
             console.error('Fallback message also failed:', fallbackError);
         }
     }
 }

 function formatFileSize(bytes) {
     if (bytes === 0) return '0 Bytes';
     const k = 1024;
     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
     const i = Math.floor(Math.log(bytes) / Math.log(k));
     return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
 }
 // ============================================
 // FAQ ACCORDION - MODERN VERSION
 // ============================================
 function toggleFaqModern(button) {
     const faqItem = button.closest('.faq-item-modern');
     const answer = faqItem.querySelector('.faq-answer-modern');
     const icon = button.querySelector('.faq-icon');
     const isOpen = faqItem.classList.contains('faq-active');

     // Close all other FAQ items
     document.querySelectorAll('.faq-item-modern').forEach(item => {
         if (item !== faqItem) {
             const otherAnswer = item.querySelector('.faq-answer-modern');
             const otherIcon = item.querySelector('.faq-icon');
             item.classList.remove('faq-active');
             otherAnswer.style.maxHeight = null;
             otherIcon.style.transform = 'rotate(0deg)';
         }
     });

     // Toggle current FAQ item
     if (isOpen) {
         faqItem.classList.remove('faq-active');
         answer.style.maxHeight = null;
         icon.style.transform = 'rotate(0deg)';
     } else {
         faqItem.classList.add('faq-active');
         answer.style.maxHeight = answer.scrollHeight + 'px';
         icon.style.transform = 'rotate(180deg)';
     }
 }