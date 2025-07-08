const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 3000;

const readData = async () => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await writeData([]);
            return [];
        }
        throw error;
    }
};

const writeData = async (data) => {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

const validateProduct = (product, isUpdate = false) => {
    const errors = [];
    const requiredFields = ['name', 'price', 'quantity', 'category'];
    const numberFields = ['price', 'quantity'];

    if (!isUpdate) {
        for (const field of requiredFields) {
            if (product[field] === undefined) {
                errors.push(`Поле '${field}' обязательно`);
            }
        }
    }

    for (const field of numberFields) {
        if (product[field] !== undefined && typeof product[field] !== 'number') {
            errors.push(`Поле '${field}' должно быть числом`);
        }
    }

    if (product.price !== undefined && product.price <= 0) {
        errors.push('Цена должна быть больше 0');
    }

    if (product.quantity !== undefined && product.quantity < 0) {
        errors.push('Количество не может быть отрицательным');
    }

    return errors;
};

app.get('/items', async (req, res) => {
    try {
        const products = await readData();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/items/:id', async (req, res) => {
    try {
        const products = await readData();
        const product = products.find(p => p.id === req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Продукт не найден' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/items', async (req, res) => {
    try {
        const errors = validateProduct(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const products = await readData();
        const newProduct = {
            id: uuidv4(),
            ...req.body
        };

        products.push(newProduct);
        await writeData(products);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/items/:id', async (req, res) => {
    try {
        const errors = validateProduct(req.body, true);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const products = await readData();
        const index = products.findIndex(p => p.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Продукт не найден' });
        }

        products[index] = { ...products[index], ...req.body };
        await writeData(products);
        res.json(products[index]);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/items/:id', async (req, res) => {
    try {
        const products = await readData();
        const filteredProducts = products.filter(p => p.id !== req.params.id);
        
        if (products.length === filteredProducts.length) {
            return res.status(404).json({ error: 'Продукт не найден' });
        }

        await writeData(filteredProducts);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});