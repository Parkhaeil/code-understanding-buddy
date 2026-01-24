
const favContainer = document.getElementById("favorite-list");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modal-content");

let favoriteMeals = [];
let currentPage = 1;
const itemsPerPage = 16;

function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites") || "[]");
}

async function loadFavorites() {
  const favs = getFavorites();
  favoriteMeals = [];

  if (favs.length === 0) {
    favContainer.innerHTML = "<p>즐겨찾기한 레시피가 없습니다.</p>";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const fetches = favs.map(id =>
    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
      .then(res => res.json())
      .then(json => json.meals[0])
  );

  favoriteMeals = await Promise.all(fetches);
  renderFavorites();
  renderPagination();
}

function renderFavorites() {
  favContainer.innerHTML = "";
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const mealsToShow = favoriteMeals.slice(start, end);
  mealsToShow.forEach(displayMeal);
}

function renderPagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const totalPages = Math.ceil(favoriteMeals.length / itemsPerPage);
  if (totalPages <= 1) return;

  if (currentPage > 1) {
    const prev = document.createElement("button");
    prev.textContent = "이전";
    prev.onclick = () => {
      currentPage--;
      renderFavorites();
      renderPagination();
    };
    pagination.appendChild(prev);
  }

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.style.fontWeight = i === currentPage ? "bold" : "normal";
    btn.onclick = () => {
      currentPage = i;
      renderFavorites();
      renderPagination();
    };
    pagination.appendChild(btn);
  }

  if (currentPage < totalPages) {
    const next = document.createElement("button");
    next.textContent = "다음";
    next.onclick = () => {
      currentPage++;
      renderFavorites();
      renderPagination();
    };
    pagination.appendChild(next);
  }
}

function displayMeal(meal) {
  const div = document.createElement("div");
  div.className = "meal";
  div.innerHTML = `
    <img src="${meal.strMealThumb}" alt="${meal.strMeal}" onclick="showDetails(${meal.idMeal})" />
    <h3>${meal.strMeal}</h3>
    <button class="favorite" onclick="toggleFavorite(${meal.idMeal})">❤</button>
  `;
  favContainer.appendChild(div);
}

function toggleFavorite(id) {
  let favs = getFavorites();
  const index = favs.indexOf(id);
  if (index > -1) favs.splice(index, 1);
  localStorage.setItem("favorites", JSON.stringify(favs));
  loadFavorites();
}

async function showDetails(id) {
  const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
  const meal = (await res.json()).meals[0];

  const cleanedInstructions = meal.strInstructions
    .split(/[\r\n]+|(?<=\.) /)
    .map(line => `<li>${line.trim()}</li>`)
    .join("");

  modalContent.innerHTML = `
    <h2>${meal.strMeal}</h2>
    <img src="${meal.strMealThumb}" width="200" />
    <p><strong>Ingredients:</strong></p>
    <ul>
      ${[...Array(20).keys()]
        .map(i => meal[`strIngredient${i+1}`] ? `<li>${meal[`strIngredient${i+1}`]} - ${meal[`strMeasure${i+1}`]}</li>` : '')
        .join('')}
    </ul>

    <button onclick="toggleInstructions()" style="margin-top:10px; padding:6px 12px; border:none; background-color:#ffb84d; color:white; border-radius:5px; cursor:pointer;">
      📖 조리법 보기
    </button>

    <ol id="instructions" class="hidden" style="margin-top: 10px;">
      ${cleanedInstructions}
    </ol>
  `;

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

window.addEventListener("click", function(e) {
  if (e.target === modal) closeModal();
});

function toggleInstructions() {
  const el = document.getElementById("instructions");
  el.classList.toggle("hidden");
}

loadFavorites();
