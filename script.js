// Arquivo: script.js

document.addEventListener('DOMContentLoaded', () => {
    const postButton = document.getElementById('post-button');
    const postTextarea = document.getElementById('post-text');
    const feed = document.getElementById('feed');

    // 1. Funcionalidade de Criar Novo Post
    postButton.addEventListener('click', () => {
        const content = postTextarea.value.trim();

        if (content) {
            // Cria a estrutura do novo post
            const newPostHTML = `
                <div class="post-card">
                    <div class="post-header">
                        <img src="https://via.placeholder.com/40" alt="Avatar">
                        <span class="username">@SeuUsuarioAgora</span>
                    </div>
                    <p class="post-content">${content}</p>
                    <div class="post-actions">
                        <button class="like-button">Curtir (0)</button>
                    </div>
                </div>
            `;

            // Insere o novo post no topo do feed
            feed.insertAdjacentHTML('afterbegin', newPostHTML);
            
            // Limpa a caixa de texto
            postTextarea.value = '';

            // Re-adiciona a escuta de eventos (likes) para o novo post
            attachLikeListeners();
        } else {
            alert('Por favor, escreva algo antes de publicar!');
        }
    });

    // 2. Funcionalidade de Curtir (Likes)
    function attachLikeListeners() {
        // Seleciona todos os botões de curtir na página
        const likeButtons = document.querySelectorAll('.like-button');

        likeButtons.forEach(button => {
            // Remove o listener anterior para evitar contagem dupla
            button.removeEventListener('click', handleLike);
            
            // Adiciona o novo listener
            button.addEventListener('click', handleLike);
        });
    }

    // Função que lida com o clique do botão Curtir
    function handleLike() {
        // Pega o texto atual do botão, e.g., "Curtir (5)"
        let buttonText = this.textContent; 
        
        // Extrai o número atual de likes (entre parênteses)
        let match = buttonText.match(/\((\d+)\)/); 
        let currentLikes = match ? parseInt(match[1]) : 0;
        
        // Aumenta a contagem de likes
        let newLikes = currentLikes + 1;
        
        // Atualiza o texto do botão
        this.textContent = `Curtir (${newLikes})`;
        
        // Altera a cor do botão para mostrar que foi curtido
        this.style.color = '#1877f2'; 
    }

    // Aplica os listeners de like quando a página carrega pela primeira vez
    attachLikeListeners();
});
          
