const BASE_URL = 'https://openlibrary.org';
let currentQuery = '';
let currentOffset = 0; 

const searchScreen = document.getElementById('search-screen');
const detailsScreen = document.getElementById('details-screen');
const resultsList = document.getElementById('resultsList');
const queryInput = document.getElementById('queryInput');
const searchBtn = document.getElementById('searchBtn');
const loader = document.getElementById('loader');
const errorUi = document.getElementById('error-ui');
const bookDetailsContainer = document.getElementById('book-details');

const showLoader = () => loader.classList.remove('hidden');
const hideLoader = () => loader.classList.add('hidden');

const showError = (message) => {
    errorUi.textContent = message;
    errorUi.classList.remove('hidden');
};
const hideError = () => errorUi.classList.add('hidden');

const showSearchScreen = () => {
    searchScreen.classList.remove('hidden');
    detailsScreen.classList.add('hidden');
};

const getFallbackText = (data) => {
    if (!data) return "Информация недоступна";
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data.value) return data.value;
    return "Информация недоступна";
};

//  ЗАПРОСЫ К API 
async function searchBooks(query) {
    try {
        showLoader();
        hideError();
        resultsList.innerHTML = '';

        const url = `${BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=20&offset=${currentOffset}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Ошибка сервера при поиске'); 

        const data = await response.json();
        renderBooks(data.docs);
    } catch (error) {
        showError('Не удалось загрузить книги. Проверьте соединение.'); 
    } finally {
        hideLoader(); 
    }
}

// Загрузка деталей книги и автора параллельно
async function loadBookDetails(workKey, authorKey) {
    try {
        showLoader();
        hideError();

        const [bookRes, authorRes] = await Promise.all([
            fetch(`${BASE_URL}${workKey}.json`).then(res => {
                if (!res.ok) throw new Error('Ошибка загрузки книги');
                return res.json();
            }),
            
            authorKey 
                ? fetch(`${BASE_URL}/authors/${authorKey}.json`).then(res => {
                    if (!res.ok) throw new Error('Ошибка загрузки автора');
                    return res.json();
                })
                : Promise.resolve(null)
        ]);

        console.log("Данные книги:", bookRes);
        console.log("Данные автора:", authorRes);

        renderFullDetails(bookRes, authorRes);
        
        searchScreen.classList.add('hidden');
        detailsScreen.classList.remove('hidden');
    } catch (error) {
        console.error(error);
        showError('Failed to load book details.');
    } finally {
        hideLoader();
    }
}

function renderBooks(books) {
    if (books.length === 0) {
        showError('Nothing found.');
        return;
    }

    books.forEach(book => {
        const div = document.createElement('div');
        div.className = 'book-item';
        div.innerHTML = `
            <strong>${book.title}</strong><br>
            <small>Author: ${book.author_name ? book.author_name.join(', ') : 'Unknown'}</small><br>
            <small>Year: ${book.first_publish_year || '—'}</small>
        `;
        
        div.onclick = () => {
            const aKey = book.author_key ? book.author_key[0] : null;
            loadBookDetails(book.key, aKey);
        };
        resultsList.appendChild(div);
    });
}

function renderFullDetails(book, author) {
    const coverImg = book.covers 
        ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-M.jpg` 
        : 'https://via.placeholder.com/150x200?text=No+Cover';

    document.getElementById('detail-cover').src = coverImg;
    document.getElementById('detail-title').textContent = book.title;
    document.getElementById('detail-desc').textContent = getFallbackText(book.description);
    document.getElementById('detail-author').textContent = `Author: ${author ? author.name : 'Unknown'}`;
    document.getElementById('detail-bio').textContent = getFallbackText(author ? author.bio : null);
    document.getElementById('detail-birth').textContent = author?.birth_date || 'Information not available';
}

searchBtn.onclick = () => {
    const query = queryInput.value.trim();
    if (query) {
        currentQuery = query;
        searchBooks(query);
    }
};

let debounceTimer;
queryInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer); 
    const query = e.target.value.trim();
    
    if (query.length > 2) {
        debounceTimer = setTimeout(() => {
            currentQuery = query;
            searchBooks(query);
        }, 500); 
    }
});