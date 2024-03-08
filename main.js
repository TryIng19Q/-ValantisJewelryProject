import MD5 from "./md5.js";

const drawFunctions = {
    async drawProducts(productsArray = [], paginationBtnsArray = null, activePaginationBtn) {
        // Отключения сообщения если массив не пуст
        if (productsArray.length > 0) {
            const messageWrapper = document.querySelector('.message-wrapper');
            messageWrapper.classList.add('element--disabled');
        };

        // Возможность снова пользоваться инпутом
        const searchForm = document.getElementById('search-form-input');
        searchForm.disabled = false;

        // Перебор массива продуктов с дальнейшем добавлением в DOM дерево
        for (let i = 0; i < productsArray.length; i++) {
            if (i >= 50) return;
            this.createProductDOMElement(productsArray[i], i);
        };

        if (paginationBtnsArray) {
            paginationBtnsArray.forEach(paginationBtn => {
                paginationBtn.classList.remove('disabled');
            });
            activePaginationBtn.classList.add('disabled');
        };
    },
    async drawFilteredProducts(value) {
        const paginationWrapper = document.querySelector('.pagination-wrapper');
        const filtredPaginationWrapper = document.querySelector('.filtred-pagination');
        const productsContainer = document.getElementById('product-container');
        productsContainer.innerHTML = '';
        
        if (value === '') {
            paginationWrapper.classList.remove('element--disabled');
            filtredPaginationWrapper.classList.add('element--disabled');


            const productsArray = await serverFunction.getProductsArray(serverFunction.currentPage, 50);
            drawFunctions.drawProducts(productsArray);
            return;
        } else {
            paginationWrapper.classList.add('element--disabled');
            filtredPaginationWrapper.classList.remove('element--disabled');
        };

        // Получения выбранного селектора для последующей фильтрацие среди этого поля
        let typeSelector = document.querySelector('.header__selector').value;

        const filteredProductArray = (await serverFunction.getFilteredProductsArray(typeSelector, typeSelector == 'price' ? Number(value) : String(value)));
        drawFunctions.drawProducts(filteredProductArray);
    },
    createProductDOMElement(productInfo, productNumber) {
        // Деструктуризация объекта с информацией о продукте
        const {id, product, brand, price} = productInfo;

        const container = document.getElementById('product-container');

        // Создание DOM елементов
        const productWrapper = document.createElement('ul');
        const productWrapperNumber = document.createElement('span');
        const productWrapperID = document.createElement('li');
        const productWrapperName = document.createElement('li');
        const productWrapperBrand = document.createElement('li');
        const productWrapperPrice = document.createElement('li');

        // Инициализация классов
        productWrapper.classList.add('product-wrapper__item');
        productWrapperNumber.classList.add('product-wrapper__item-number');
        productWrapperID.classList.add('product-wrapper__id');
        productWrapperName.classList.add('product-wrapper__name');
        productWrapperBrand.classList.add('product-wrapper__brand');
        productWrapperPrice.classList.add('product-wrapper__price');

        // Заполнение элементов
        productWrapperNumber.textContent = productNumber + 1;
        productWrapperID.textContent = id;
        productWrapperName.textContent = product;
        productWrapperBrand.textContent = brand;
        productWrapperPrice.textContent = price + '$';

        // Добавление в DOM дерево
        productWrapper.append(productWrapperNumber);
        productWrapper.append(productWrapperID);
        productWrapper.append(productWrapperName);
        productWrapper.append(productWrapperBrand);
        productWrapper.append(productWrapperPrice);

        container.append(productWrapper);
    },
};
const serverFunction = {
    currentPage: 1,
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

        let filtredIDsList = [value];
        if (field !== 'id') {
            filtredIDsList = await fetch('https://api.valantis.store:41000/', {
                headers: {
                    'Content-Type': 'application/json',
                    "X-Auth": this.generateXAuthKey(),
                },
                method: "POST",
                body: JSON.stringify({
                    "action": "filter",
                    "params": {[field]: value}
                }),
            }).then(resolve => (resolve.json())).then(resolve => resolve.result).catch((err) => {
                console.error(err);
                return null;
            });
        };

        const reloadBtnForm = document.querySelector('.error-wrapper');
        if (filtredIDsList === null) {
            reloadBtnForm.classList.remove('element--disabled');
            this.lastRequestBody = () => this.getFilteredProductsArray(field, value);
            return;
        };

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
        }).then(resolve => (resolve.json())).then(resolve => resolve.result).catch((err) => {
            console.error(err);
            return null;
        });

        if (serverAnswer === null) {
            reloadBtnForm.classList.remove('element--disabled');
            this.lastRequestBody = () => this.getFilteredProductsArray(field, value);
            return;
        };

        // Отображение нужного колличества кнопок
        const paginationBtnsArray = document.querySelectorAll('.filtred-pagination-btn');
        paginationBtnsArray.forEach(paginationBtn => {
            paginationBtn.classList.add('element--disabled');

            if (Math.ceil(Number(serverAnswer.length) / 50) > Number(paginationBtn.getAttribute('filtredID')) - 1) {
                paginationBtn.classList.remove('element--disabled');
            };
        });

        // Показ сообщения если массив пуст
        const messageWrapper = document.querySelector('.message-wrapper');
        if (serverAnswer.length == 0) {
            messageWrapper.classList.remove('element--disabled');
        };

        this.currentProductArray = serverAnswer;

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
const searchFormInit = function() {
    const searchForm = document.getElementById('search-form-input');
    const paginationBtnsArray = document.querySelectorAll('.filtred-pagination-btn');
  
    let timer;
    searchForm.addEventListener('input', async() => {
        clearInterval(timer);

        timer = setInterval(async() => {
            for (let i = 0; i < paginationBtnsArray.length; i++) {
                paginationBtnsArray[i].textContent = i + 1;
                console.log(i + 1);
            };

            searchForm.disabled = true;
            drawFunctions.drawFilteredProducts(searchForm.value);

            clearInterval(timer);
        }, 2000);
    });
};
const paginationFormInit = function() {
    const paginationBtnsArray = document.querySelectorAll('.pagination-btn');

    paginationBtnsArray.forEach(paginationBtn => {
        paginationBtn.addEventListener('click', async function() {
            // Отключение инпута
            const searchForm = document.getElementById('search-form-input');
            searchForm.disabled = true;

            // Анимация пагинации
            const currentPage = Number(this.textContent);
            serverFunction.currentPage = currentPage;

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
const filtredPaginationFormInit = function() {
    const paginationBtnsArray = document.querySelectorAll('.filtred-pagination-btn');

    paginationBtnsArray.forEach(paginationBtn => {
        paginationBtn.addEventListener('click', async function() {
            // Анимация пагинации
            const currentPage = Number(this.textContent);
            serverFunction.currentPage = currentPage;

            const oldPage = document.querySelector('.filtred-pagination a.active');
            oldPage.classList.remove('active');
            oldPage.classList.remove('disabled');

            let newPageNumber = currentPage <= 3 ? 1 : currentPage - 3;

            paginationBtnsArray.forEach(paginationBtn => {
                paginationBtn.setAttribute('filtredID', newPageNumber);
                paginationBtn.textContent = newPageNumber;

                // Блокировка всех кнопок пока не будет загружена текущая страница товаров
                paginationBtn.classList.add('disabled');
                paginationBtn.classList.remove('element--disabled');

                console.log(`max count pages >>> ${Math.ceil(Number(serverFunction.currentProductArray.length) / 50)} current page >>> ${currentPage}`);
                if (Math.ceil(Number(serverFunction.currentProductArray.length) / 50) <= Number(paginationBtn.getAttribute('filtredID')) - 1) {
                    paginationBtn.classList.add('element--disabled');
                };

                newPageNumber++
            });

            const newPage = document.querySelector(`a[filtredID='${currentPage}']`);
            newPage.classList.add('active');

            // Логика пагинации
            const productsContainer = document.getElementById('product-container');
            productsContainer.innerHTML = '';

            const drawCurrentPageArray = serverFunction.currentProductArray.slice(50 * (currentPage - 1), 50 * (currentPage));
            drawFunctions.drawProducts(drawCurrentPageArray, paginationBtnsArray, newPage);
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

    searchFormInit();
    paginationFormInit();
    filtredPaginationFormInit()
    reloadServerRequestInit();
}();
