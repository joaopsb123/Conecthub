// Arquivo: script.js (FINALIZADO com credenciais e Tabela: 'todos')

// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://nkidvwxkzhvscsisztsa.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raWR2d3hremh2c2NzaXN6dHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTAzMzYsImV4cCI6MjA3NjYyNjMzNn0.TXucPWNRbkEAweGzn2Zi_jc8R_U1t70eRn4SQ1YWTdc'; 

// Inicializa o cliente Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --------------------------------------------------------


document.addEventListener('DOMContentLoaded', () => {
    const postButton = document.getElementById('post-button');
    const postTextarea = document.getElementById('post-text');
    const feed = document.getElementById('feed');
    // NOME DA TABELA AJUSTADO PARA 'todos'
    const TABLE_NAME = 'todos'; 

    // Função de utilidade para criar a estrutura HTML de um post
    function createPostElement(post) {
        const postElement = document.createElement('div');
        postElement.classList.add('post-card');
        postElement.dataset.id = post.id; 

        postElement.innerHTML = `
            <div class="post-header">
                <img src="https://via.placeholder.com/40" alt="Avatar">
                <span class="username">${post.username}</span>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                <button class="like-button">Curtir (${post.likes})</button>
            </div>
        `;

        // Adiciona o listener de like
        postElement.querySelector('.like-button').addEventListener('click', handleLike);
        return postElement;
    }

    // --- 1. CARREGAR POSTS EXISTENTES AO INICIAR ---
    async function loadInitialPosts() {
        // Busca na tabela 'todos'
        const { data: posts, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false }) 
            .limit(50);

        if (error) {
            console.error('Erro ao carregar posts:', error);
            feed.innerHTML = `<p>Erro ao carregar o feed. Verifique se a tabela \`${TABLE_NAME}\` existe e tem a política RLS de SELECT (TRUE).</p>`;
            return;
        }

        posts.forEach(post => {
            const postElement = createPostElement(post);
            feed.appendChild(postElement);
        });
    }

    // --- 2. FUNCIONALIDADE DE POSTAGEM (INSERIR NO BANCO) ---
    postButton.addEventListener('click', async () => {
        const content = postTextarea.value.trim();
        const fixedUsername = '@ConectaHubUser'; 

        if (content) {
            // Insere na tabela 'todos'
            const { error } = await supabase
                .from(TABLE_NAME)
                .insert([
                    { username: fixedUsername, content: content, likes: 0 } 
                    // Assumindo que 'todos' tem as colunas 'username', 'content' e 'likes'
                ]);

            if (error) {
                console.error('Erro ao publicar:', error);
                alert('Não foi possível publicar. O erro é provavelmente uma FALHA na RLS de INSERT. Verifique o console.');
                return;
            }

            postTextarea.value = '';
            
        } else {
            alert('Por favor, escreva algo antes de publicar!');
        }
    });

    // --- 3. FUNCIONALIDADE DE LIKE (ATUALIZAR O BANCO) ---
    async function handleLike() {
        const button = this;
        const postCard = button.closest('.post-card');
        const postId = parseInt(postCard.dataset.id);

        let currentLikes = parseInt(button.textContent.match(/\((\d+)\)/)[1]);
        let newLikes = currentLikes + 1;
        
        // Atualiza na tabela 'todos'
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ likes: newLikes })
            .eq('id', postId);

        if (error) {
             console.error('Erro ao curtir:', error);
             return;
        }
    }

    // --- 4. TEMPO REAL (ASSINATURA DO SUPABASE) ---
    function subscribeToRealtime() {
        // Assina mudanças na tabela 'todos'
        supabase
            .channel(`public:${TABLE_NAME}`) 
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, (payload) => {
                
                if (payload.eventType === 'INSERT') {
                    // Novo post inserido
                    const newPost = payload.new;
                    const postElement = createPostElement(newPost);
                    feed.prepend(postElement); 
                    
                } else if (payload.eventType === 'UPDATE') {
                    // Post existente foi atualizado (ex: um like)
                    const updatedPost = payload.new;
                    const existingCard = document.querySelector(`.post-card[data-id="${updatedPost.id}"]`);
                    
                    if (existingCard) {
                        // Atualiza o botão de like
                        const likeButton = existingCard.querySelector('.like-button');
                        likeButton.textContent = `Curtir (${updatedPost.likes})`;
                        likeButton.style.color = updatedPost.likes > 0 ? '#1877f2' : '#606770'; 
                    }
                }
            })
            .subscribe();
    }
    
    loadInitialPosts();
    subscribeToRealtime();
});
        
