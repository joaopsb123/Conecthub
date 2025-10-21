// Arquivo: script.js (FINALIZADO com credenciais)

// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://nkidvwxkzhvscsisztsa.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raWR2d3hremh2c2NzaXN6dHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA1MDMzNiwiZXhwIjoyMDc2NjI2MzM2fQ.JOurp2RZJ27XN10jdMnk58tUtAK9PYr4oUMsgtBLFrY'; 

// Inicializa o cliente Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --------------------------------------------------------


document.addEventListener('DOMContentLoaded', () => {
    const postButton = document.getElementById('post-button');
    const postTextarea = document.getElementById('post-text');
    const feed = document.getElementById('feed');

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
        // Pega os 50 posts mais recentes
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false }) 
            .limit(50);

        if (error) {
            console.error('Erro ao carregar posts:', error);
            feed.innerHTML = '<p>Erro ao carregar o feed. Verifique se a tabela `posts` está configurada no Supabase.</p>';
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
        // Usamos um nome de usuário fixo, pois não há sistema de login
        const fixedUsername = '@ConectaHubUser'; 

        if (content) {
            // Insere o novo post no Supabase
            const { error } = await supabase
                .from('posts')
                .insert([
                    { username: fixedUsername, content: content }
                ]);

            if (error) {
                console.error('Erro ao publicar:', error);
                alert('Não foi possível publicar. Verifique o console para mais detalhes.');
                return;
            }

            // Limpa a caixa de texto
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

        // Extrai e incrementa o contador de likes
        let currentLikes = parseInt(button.textContent.match(/\((\d+)\)/)[1]);
        let newLikes = currentLikes + 1;
        
        // Atualiza a contagem de likes no Supabase
        const { error } = await supabase
            .from('posts')
            .update({ likes: newLikes })
            .eq('id', postId);

        if (error) {
             console.error('Erro ao curtir:', error);
             return;
        }
        
        // O restante da atualização do DOM será tratado pelo módulo de Tempo Real (Realtime)
    }

    // --- 4. TEMPO REAL (ASSINATURA DO SUPABASE) ---
    function subscribeToRealtime() {
        // Escuta qualquer mudança (INSERT, UPDATE) na tabela 'posts'
        supabase
            .channel('public:posts') 
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
                
                if (payload.eventType === 'INSERT') {
                    // Novo post inserido
                    const newPost = payload.new;
                    const postElement = createPostElement(newPost);
                    feed.prepend(postElement); // Adiciona no topo
                    
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
    
    // Inicia o carregamento e a escuta em tempo real
    loadInitialPosts();
    subscribeToRealtime();
});
            
