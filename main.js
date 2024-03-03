import MD5 from "./md5.js";

const drawFunctions = {
    async drawProducts(productsArray = [], paginationBtnsArray = null, activePaginationBtn) {
        serverFunction.currentProductArray = productsArray;

        // Перебор массива продуктов с дальнейшем добавлением в DOM дерево
        productsArray.forEach(productInfo => {
            this.createProductDOMElement(productInfo);
        });

        if (paginationBtnsArray) {
            paginationBtnsArray.forEach(paginationBtn => {
                paginationBtn.classList.remove('disabled');
            });
            activePaginationBtn.classList.add('disabled');
        };
    },
    async drawFilteredProducts(value) {
        const productsContainer = document.getElementById('product-container');
        productsContainer.innerHTML = '';
        
        if (value === '') {
            const productsArray = await serverFunction.getProductsArray();
            drawFunctions.drawProducts(productsArray);
            return;
        };

        const filteredProductArray = (await serverFunction.getFilteredProductsArray('price', Number(value)));
        drawFunctions.drawProducts(filteredProductArray);
    },
    createProductDOMElement(productInfo) {
        // Деструктуризация объекта с информацией о продукте
        const {id, product, brand, price} = productInfo;

        const container = document.getElementById('product-container');

        // Создание DOM елементов
        const productWrapper = document.createElement('ui');
        const productWrapperID = document.createElement('li');
        const productWrapperName = document.createElement('li');
        const productWrapperBrand = document.createElement('li');
        const productWrapperPrice = document.createElement('li');

        // Инициализация классов
        productWrapper.classList.add('product-wrapper__item');
        productWrapperID.classList.add('product-wrapper__id');
        productWrapperName.classList.add('product-wrapper__name');
        productWrapperBrand.classList.add('product-wrapper__brand');
        productWrapperPrice.classList.add('product-wrapper__price');

        // Заполнение элементов
        productWrapperID.textContent = id;
        productWrapperName.textContent = product;
        productWrapperBrand.textContent = brand;
        productWrapperPrice.textContent = price + '$';

        // Добавление в DOM дерево
        productWrapper.append(productWrapperID);
        productWrapper.append(productWrapperName);
        productWrapper.append(productWrapperBrand);
        productWrapper.append(productWrapperPrice);

        container.append(productWrapper);
    },
};
const serverFunction = {
    currentProductArray: [],
    lastRequestBody: () => {},
    generateXAuthKey() {
        const date = new Date();
        return MD5('Valantis_' + date.getFullYear() + (date.getMonth() > 9 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1)) + (date.getDate() > 9 ? date.getDate() : '0' + date.getDate()));
    },
    async getProductsArray(startWith = 0, count = 50) {
        // Запрос на сервер для получения массива индексов
        const IDsList = await fetch('https://api.valantis.store:41000/', {
            headers: {
                'Content-Type': 'application/json',
                "X-Auth": this.generateXAuthKey(),
            },
            method: "POST",
            body: JSON.stringify({
                "action": "get_ids",
                "params": {"offset": startWith, "limit": count}
            }),
        }).then(response => (response.json())).then(response => response.result).catch((err) => {
            console.error(err);
            return null;
        });

        const reloadBtnForm = document.querySelector('.error-wrapper');
        if (IDsList === null) {
            reloadBtnForm.classList.remove('element--disabled');
            this.lastRequestBody = () => this.getProductsArray(startWith, count);
            return;
        };

        // Запрос на сервер для получения массива продуктов
        const serverAnswer = await fetch('https://api.valantis.store:41000/', {
            headers: {
                'Content-Type': 'application/json',
                "X-Auth": this.generateXAuthKey(),
            },
            method: "POST",
            body: JSON.stringify({
                "action": "get_items",
                "params": {"ids": IDsList}
            })
        }).then(response => (response.json())).then(response => (response.result)).catch((err) => {
            console.error(err);
            return null;
        });

        if (serverAnswer === null) {
            reloadBtnForm.classList.remove('element--disabled');
            this.lastRequestBody = () => this.getProductsArray(startWith, count);
            return;
        };

        // Поиск и исключение дубликатов из массива
        for (let i = 0; i < serverAnswer.length; i++) {
            for (let j = serverAnswer.length - 1; j > i; j--) {
                if (serverAnswer[i]['id'] === serverAnswer[j]['id']) {
                    serverAnswer.splice(j, 1);
                };
            };
        };

        return serverAnswer;
    },
    async getFilteredProductsArray(field, value) {
        // Запрос на сервер для получения отфильтрованного массива индексов
        const filtredIDsList = await fetch('https://api.valantis.store:41000/', {
            headers: {
                'Content-Type': 'application/json',
                "X-Auth": this.generateXAuthKey(),
            },
            method: "POST",
            body: JSON.stringify({
                "action": "filter",
                "params": {[field]: value}
            }),
        }).then(resolve => (resolve.json())).then(resolve => resolve.result);

        const serverAnswer = await fetch('https://api.valantis.store:41000/', {
            headers: {
                'Content-Type': 'application/json',
                "X-Auth": this.generateXAuthKey(),
            },
            method: "POST",
            body: JSON.stringify({
                "action": "get_items",
                "params": {"ids": filtredIDsList}
            })
        }).then(resolve => (resolve.json())).then(resolve => resolve.result);;

        return serverAnswer;
    },
    async reloadServerRequest(requestData) {
        const IDsList = await fetch('https://api.valantis.store:41000/', {
            headers: {
                'Content-Type': 'application/json',
                "X-Auth": this.generateXAuthKey(),
            },
            method: "POST",
            body: JSON.stringify(requestData),
        }).then(resolve => (resolve.json())).then(resolve => resolve.result);

        return IDsList;
    },
};
const filtersInit = function() {
    const filterId = document.getElementById('filterId'); 
    const filterName = document.getElementById('filterName'); 
    const filterBrand = document.getElementById('filterBrand'); 
    const filterPrice = document.getElementById('filterPrice');

    filterId.addEventListener('click', function() {
        const productArray = serverFunction.currentProductArray;

        for (let i = 0; i < productArray.length; i++) {
            for (let j = 0; j < productArray.length; j++) {
                if (Number(productArray[i].id) < Number(productArray[j].id)) {
                    const oldValue = productArray[i];
                    productArray[i] = productArray[j];
                    productArray[j] = oldValue;
                };
            };
        };
        console.log(productArray);

        if (this.getAttribute('filtertype') === 'min-to-max') {
            this.setAttribute('filtertype', 'max-to-min');
            this.style.transform = "rotate(180deg)";
        } else if (this.getAttribute('filtertype') === 'max-to-min') {
            console.log('rotate');
            this.setAttribute('filtertype', 'min-to-max');
            this.style.transform = "rotate(0deg)";
        }
    });

    filterName.addEventListener('click', function() {
        if (this.getAttribute('filtertype') === 'min-to-max') {
            this.setAttribute('filtertype', 'max-to-min');
            this.style.transform = "rotate(180deg)";
        } else if (this.getAttribute('filtertype') === 'max-to-min') {
            console.log('rotate');
            this.setAttribute('filtertype', 'min-to-max');
            this.style.transform = "rotate(0deg)";
        }
    });

    filterBrand.addEventListener('click', function() {
        if (this.getAttribute('filtertype') === 'min-to-max') {
            this.setAttribute('filtertype', 'max-to-min');
            this.style.transform = "rotate(180deg)";
        } else if (this.getAttribute('filtertype') === 'max-to-min') {
            console.log('rotate');
            this.setAttribute('filtertype', 'min-to-max');
            this.style.transform = "rotate(0deg)";
        }
    });

    filterPrice.addEventListener('click', function() {
        if (this.getAttribute('filtertype') === 'min-to-max') {
            this.setAttribute('filtertype', 'max-to-min');
            this.style.transform = "rotate(180deg)";
        } else if (this.getAttribute('filtertype') === 'max-to-min') {
            console.log('rotate');
            this.setAttribute('filtertype', 'min-to-max');
            this.style.transform = "rotate(0deg)";
        }
    });

};
const searchFormInit = function() {
    const searchForm = document.getElementById('search-form-input');
  
    let timer;
    searchForm.addEventListener('input', async() => {
        clearInterval(timer);

        timer = setInterval(async() => {
            drawFunctions.drawFilteredProducts(searchForm.value);

            clearInterval(timer);
        }, 2000);
    });
};
const paginationFormInit = function() {
    const paginationBtnsArray = document.querySelectorAll('.pagination-btn');

    paginationBtnsArray.forEach(paginationBtn => {
        paginationBtn.addEventListener('click', async function() {
            // Анимация пагинации
            const currentPage = Number(this.textContent);
            const oldPage = document.querySelector('.active');
            oldPage.classList.remove('active');
            oldPage.classList.remove('disabled');

            let newPageNumber = currentPage <= 3 ? 1 : currentPage - 3;

            paginationBtnsArray.forEach(paginationBtn => {
                paginationBtn.id = newPageNumber;
                paginationBtn.textContent = newPageNumber;

                // Блокировка всех кнопок пока не будет загружена текущая страница товаров
                paginationBtn.classList.add('disabled');

                newPageNumber++
            });

            const newPage = document.getElementById(currentPage);
            newPage.classList.add('active');

            // Логика пагинации
            const productsContainer = document.getElementById('product-container');
            productsContainer.innerHTML = '';

            const productsArray = await serverFunction.getProductsArray(currentPage , 50);
            drawFunctions.drawProducts(productsArray, paginationBtnsArray, newPage);
        });
    });
};
const reloadServerRequestInit = function() {
    const reloadBtn = document.getElementById('reload-server-request');

    reloadBtn.addEventListener('click', async() => {
        const reloadBtnForm = document.querySelector('.error-wrapper');
        reloadBtnForm.classList.add('element--disabled');

        const productsArray = await serverFunction.lastRequestBody();
        drawFunctions.drawProducts(productsArray);
    });
};


~async function(){
    // const productsArray = await serverFunction.getProductsArray();
    // drawFunctions.drawProducts(productsArray);

    filtersInit();
    searchFormInit();
    paginationFormInit();
    reloadServerRequestInit();
}();


// всего 8004 продукта