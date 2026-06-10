// ==========================================
// 1. ESTADO GLOBAL Y PERSISTENCIA
// ==========================================
let productos = [];
let carrito = JSON.parse(localStorage.getItem("carritoPistacha")) || [];
const MI_TELEFONO = "5493412287213";

const TARIFAS = {
    HORA: 4000,
    DIA_COMPLETO: 20000,
    FINDE: 55000
};

// Formatea números como $2.500 en lugar de $2500
function formatearPrecio(num) {
    return num.toLocaleString("es-AR");
}

document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
    actualizarCarritoUI();
    verificarUsuario();

    document.getElementById("btn-carrito")?.addEventListener("click", abrirCarrito);
    document.getElementById("cerrar-carrito")?.addEventListener("click", cerrarCarrito);
    document.getElementById("registrar")?.addEventListener("click", registrarUsuario);
    document.getElementById("buscador")?.addEventListener("input", filtrarProductos);
    document.getElementById("sumarGuarderia")?.addEventListener("click", agregarServicioGuarderia);
    document.getElementById("finalizar")?.addEventListener("click", enviarWhatsApp);

    // Preview de precio estimado en guardería (solo existe en guarderia.html)
    document.getElementById("tipo-guarderia")?.addEventListener("change", actualizarPrecioEstimado);
    document.getElementById("cantidad-guarderia")?.addEventListener("input", actualizarPrecioEstimado);
    actualizarPrecioEstimado(); // Mostrar precio inicial al cargar
});

// ==========================================
// 2. CARGA ASINCRÓNICA
// ==========================================
async function cargarProductos() {
    try {
        const res = await fetch("productos.json");
        if (!res.ok) throw new Error("Error de red al cargar productos");
        productos = await res.json();
        mostrarProductos(productos);
    } catch (error) {
        console.error("No se pudo cargar el JSON:", error);
        const contenedor = document.getElementById("productos");
        if (contenedor) {
            contenedor.innerHTML = `<p style="color:#df5050; text-align:center;">
                No se pudieron cargar los productos. Revisá tu conexión.
            </p>`;
        }
    }
}

// ==========================================
// 3. RENDERIZADO Y FILTRADO
// ==========================================
function mostrarProductos(lista) {
    const contenedor = document.getElementById("productos");
    if (!contenedor) return;

    if (lista.length === 0) {
        contenedor.innerHTML = `<p style="text-align:center; color:#888; grid-column: 1/-1;">
            No se encontraron productos con esa búsqueda.
        </p>`;
        return;
    }

    contenedor.innerHTML = "";

    lista.forEach(p => {
        const div = document.createElement("div");
        div.classList.add("producto");

        let selectorVariantes = "";
        if (p.variantes && p.variantes.length > 0) {
            selectorVariantes = `<select id="variante-${p.id}" class="select-variante">`;
            p.variantes.forEach(variante => {
                selectorVariantes += `<option value="${variante}">${variante}</option>`;
            });
            selectorVariantes += `</select>`;
        }

        let descripcionHtml = "";
        if (p.descripcion) {
            descripcionHtml = `
                <details>
                    <summary>Ver descripción...</summary>
                    <p>${p.descripcion}</p>
                </details>
            `;
        }

        // Badge de stock bajo
        let badgeStock = "";
        if (p.stock > 0 && p.stock <= 3) {
            badgeStock = `<span class="badge-stock-bajo">¡Últimas ${p.stock}!</span>`;
        } else if (p.stock === 0) {
            badgeStock = `<span class="badge-agotado">Agotado</span>`;
        }

        div.innerHTML = `
            <div class="imagen-contenedor">
                <img src="${p.img}" alt="${p.nombre}" loading="lazy">
                ${badgeStock}
            </div>
            <h3>${p.nombre}</h3>
            <p class="precio-texto">$${formatearPrecio(p.precio)}</p>
            ${descripcionHtml}
            ${selectorVariantes}
            <button onclick="agregarAlCarrito(${p.id})" ${p.stock === 0 ? "disabled" : ""}>
                ${p.stock === 0 ? "Sin stock" : "Agregar"}
            </button>
        `;
        contenedor.appendChild(div);
    });
}

function filtrarProductos(e) {
    const busqueda = e.target.value.toLowerCase().trim();
    const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda) ||
        p.categoria.toLowerCase().includes(busqueda)
    );
    mostrarProductos(filtrados);
}

// ==========================================
// 4. LÓGICA DE NEGOCIO (Carrito y Guardería)
// ==========================================
function agregarAlCarrito(id) {
    const prod = productos.find(p => p.id === id);
    if (!prod) return;

    let saborElegido = "";
    const selector = document.getElementById(`variante-${id}`);
    if (selector) {
        saborElegido = selector.value;
    }

    const nombreEnCarrito = saborElegido ? `${prod.nombre} (${saborElegido})` : prod.nombre;
    // MEJORA: idCarrito con string explícito para evitar colisiones con ids numéricos de servicios
    const idUnicoCarrito = saborElegido ? `prod-${id}-${saborElegido}` : `prod-${id}`;

    const existeEnCarrito = carrito.find(p => p.idCarrito === idUnicoCarrito);

    if (existeEnCarrito) {
        if (existeEnCarrito.cantidad < prod.stock) {
            existeEnCarrito.cantidad++;
            actualizarCarritoUI();
        } else {
            Swal.fire({
                icon: "warning",
                title: "Límite de stock",
                text: `¡Ups! Solo tenemos ${prod.stock} unidades disponibles.`
            });
        }
    } else {
        if (prod.stock > 0) {
            carrito.push({
                ...prod,
                nombre: nombreEnCarrito,
                idCarrito: idUnicoCarrito,
                cantidad: 1
            });
            actualizarCarritoUI();
            abrirCarrito(); // Abre el carrito al agregar para dar feedback visual
        } else {
            Swal.fire({
                icon: "error",
                title: "Agotado",
                text: "¡Producto sin stock por el momento!"
            });
        }
    }
}

function actualizarCarritoUI() {
    const lista = document.getElementById("lista-carrito");
    const totalElemento = document.getElementById("total");

    if (!lista) return;

    lista.innerHTML = "";

    carrito.forEach((p, index) => {
        const li = document.createElement("li");
        li.style.marginBottom = "10px";
        li.style.borderBottom = "1px solid #ccc";
        li.style.paddingBottom = "5px";

        li.innerHTML = `
            <strong>${p.nombre}</strong><br>
            Cant: ${p.cantidad} — $${formatearPrecio(p.precio * p.cantidad)}
            <button onclick="eliminar(${index})" style="width: auto; padding: 2px 8px; margin-left: 10px; background: #666;">❌</button>
        `;
        lista.appendChild(li);
    });

    const total = carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    if (totalElemento) totalElemento.textContent = formatearPrecio(total);

    const contador = document.getElementById("contador-carrito");
    if (contador) {
        const totalItems = carrito.reduce((acc, p) => acc + p.cantidad, 0);
        contador.innerText = totalItems;
    }

    localStorage.setItem("carritoPistacha", JSON.stringify(carrito));
}

function eliminar(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

// Preview de precio antes de agregar (solo en guardería)
function actualizarPrecioEstimado() {
    const tipoEl = document.getElementById("tipo-guarderia");
    const cantidadEl = document.getElementById("cantidad-guarderia");
    const boxEl = document.getElementById("precio-estimado");
    const textoEl = document.getElementById("texto-precio-estimado");

    if (!tipoEl || !boxEl || !textoEl) return;

    const tipo = tipoEl.value;
    const cantidad = parseInt(cantidadEl?.value) || 1;

    if (tipo === "paseo") {
        boxEl.style.display = "none";
        return;
    }

    let precio = 0;
    let detalle = "";

    switch (tipo) {
        case "hora":
            precio = cantidad * TARIFAS.HORA;
            if (cantidad > 4) {
                precio = precio * 0.85;
                detalle = `${cantidad} hs con 15% OFF`;
            } else {
                detalle = `${cantidad} hs`;
            }
            break;
        case "dia":
            precio = TARIFAS.DIA_COMPLETO * cantidad;
            detalle = `${cantidad} día(s) completo(s)`;
            break;
        case "finde":
            precio = TARIFAS.FINDE * cantidad;
            detalle = `${cantidad} fin(es) de semana`;
            break;
    }

    textoEl.innerHTML = `💰 <strong>${detalle}:</strong> $${formatearPrecio(Math.round(precio))}`;
    boxEl.style.display = "block";
}

function agregarServicioGuarderia() {
    const tipo = document.getElementById("tipo-guarderia").value;
    const cantidad = parseInt(document.getElementById("cantidad-guarderia").value) || 1;
    const fechaInput = document.getElementById("fecha-guarderia").value;

    let precioFinal = 0;
    let nombreServicio = "";

    if (!fechaInput) {
        Swal.fire({
            icon: "warning",
            title: "Falta la fecha",
            text: "Por favor, seleccioná una fecha de ingreso para la guardería."
        });
        return;
    }

    // Formato DD/MM/AAAA
    const [anio, mes, dia] = fechaInput.split("-");
    const fechaTexto = ` (Ingreso: ${dia}/${mes}/${anio})`;

    switch (tipo) {
        case "hora":
            precioFinal = cantidad * TARIFAS.HORA;
            if (cantidad > 4) {
                precioFinal = Math.round(precioFinal * 0.85);
                nombreServicio = `Guardería: ${cantidad}hs (15% OFF)${fechaTexto}`;
            } else {
                nombreServicio = `Guardería: ${cantidad}hs${fechaTexto}`;
            }
            break;
        case "dia":
            precioFinal = TARIFAS.DIA_COMPLETO * cantidad;
            nombreServicio = `Guardería: ${cantidad} Día(s) Completo(s)${fechaTexto}`;
            break;
        case "finde":
            precioFinal = TARIFAS.FINDE * cantidad;
            nombreServicio = `Guardería: ${cantidad} Fin de Semana${fechaTexto}`;
            break;
        case "paseo":
            Swal.fire({
                icon: "info",
                title: "Coordinamos por WhatsApp",
                text: "Los packs mensuales de paseos se coordinan directamente. ¡Te esperamos!"
            });
            return;
    }

    if (precioFinal > 0) {
        const servicio = {
            id: `SERV-${Date.now()}`,
            idCarrito: `serv-${Date.now()}`, // MEJORA: prefijo "serv-" para no colisionar con productos
            nombre: nombreServicio,
            precio: precioFinal,
            cantidad: 1
        };
        carrito.push(servicio);
        actualizarCarritoUI();
        abrirCarrito();
        Swal.fire({
            icon: "success",
            title: "¡Genial!",
            text: "¡Guardería agregada al carrito!",
            showConfirmButton: false,
            timer: 1500
        });
    }
}

// ==========================================
// 5. REGISTRO Y WHATSAPP
// ==========================================
function registrarUsuario() {
    const nombre = document.getElementById("nombre").value.trim();
    if (nombre) {
        localStorage.setItem("usuarioPistacha", nombre);
        verificarUsuario();
        Swal.fire({
            icon: "success",
            title: `¡Hola, ${nombre}!`,
            text: "Ya estás registrado/a. ¡Empezá a hacer tu pedido!",
            showConfirmButton: false,
            timer: 2000
        });
    }
}

function verificarUsuario() {
    const nombre = localStorage.getItem("usuarioPistacha");
    if (nombre) {
        const usuarioInfo = document.getElementById("usuarioInfo");
        if (usuarioInfo) {
            usuarioInfo.style.display = "block";
            usuarioInfo.innerText = `👋 ¡Hola, ${nombre}!`;
        }
    }
}

function enviarWhatsApp() {
    if (carrito.length === 0) {
        Swal.fire({
            icon: "info",
            title: "Carrito vacío",
            text: "¡Agregá algunos snacks o días de guardería antes de finalizar tu pedido!"
        });
        return;
    }

    const nombreUser = localStorage.getItem("usuarioPistacha") || "Cliente";
    const opcionEntrega = document.querySelector('input[name="entrega"]:checked').value;
    const total = carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);

    let mensaje = `Hola Marisel! Soy ${nombreUser}, quiero hacer un pedido:%0A`;
    mensaje += `*Modalidad:* ${opcionEntrega}%0A%0A`;

    carrito.forEach(p => {
        mensaje += `- ${p.nombre} (Cant: ${p.cantidad} — $${formatearPrecio(p.precio * p.cantidad)})%0A`;
    });

    mensaje += `%0A*Total: $${formatearPrecio(total)}*`;

    window.open(`https://wa.me/${MI_TELEFONO}?text=${mensaje}`, "_blank");
}

// ==========================================
// 6. FUNCIONES DEL MENÚ DESPLEGABLE
// ==========================================
function abrirCarrito() {
    document.getElementById("seccion-carrito")?.classList.add("abierto");
}

function cerrarCarrito() {
    document.getElementById("seccion-carrito")?.classList.remove("abierto");
}
