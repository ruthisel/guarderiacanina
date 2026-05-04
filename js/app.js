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

document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
    actualizarCarritoUI();
    verificarUsuario();

    // Le agregamos el signo de interrogación (?.) a todos. 
    // Si el elemento existe, le pone el evento. Si lo borraste del HTML, lo ignora y no se rompe la página.
    document.getElementById("btn-carrito")?.addEventListener("click", abrirCarrito);
    document.getElementById("cerrar-carrito")?.addEventListener("click", cerrarCarrito);
    document.getElementById("registrar")?.addEventListener("click", registrarUsuario);
    document.getElementById("buscador")?.addEventListener("input", filtrarProductos);
    document.getElementById("sumarGuarderia")?.addEventListener("click", agregarServicioGuarderia);
    document.getElementById("finalizar")?.addEventListener("click", enviarWhatsApp);
});
// ==========================================
// 2. CARGA ASINCRÓNICA
// ==========================================
async function cargarProductos() {
    try {
        const res = await fetch("productos.json");
        if (!res.ok) throw new Error("Error de red");
        productos = await res.json();
        mostrarProductos(productos);
    } catch (error) {
        console.error("No se pudo cargar el JSON:", error);
    }
}

// ==========================================
// 3. RENDERIZADO Y FILTRADO
// ==========================================
function mostrarProductos(lista) {
    const contenedor = document.getElementById("productos");
    contenedor.innerHTML = "";

    lista.forEach(p => {
        const div = document.createElement("div");
        div.classList.add("producto");

        // Selector de sabores
        let selectorVariantes = "";
        if (p.variantes) {
            selectorVariantes = `<select id="variante-${p.id}" style="margin-bottom: 10px; padding: 5px; border-radius: 5px; width: 100%; border: 1px solid #ccc;">`;
            p.variantes.forEach(variante => {
                selectorVariantes += `<option value="${variante}">${variante}</option>`;
            });
            selectorVariantes += `</select>`;
        }

        // Acordeón de descripción
        let descripcionHtml = "";
        if (p.descripcion) {
            descripcionHtml = `
                <details>
                    <summary>Ver descripción...</summary>
                    <p>${p.descripcion}</p>
                </details>
            `;
        }

        div.innerHTML = `
            <div class="imagen-contenedor">
                <img src="${p.img}" alt="${p.nombre}">
            </div>
            <h3>${p.nombre}</h3>
            <p class="precio-texto">$${p.precio}</p>
            ${descripcionHtml}
            ${selectorVariantes}
            <button onclick="agregarAlCarrito(${p.id})">Agregar</button>
        `;
        contenedor.appendChild(div);
    });
}

function filtrarProductos(e) {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda));
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
    const idUnicoCarrito = saborElegido ? `${id}-${saborElegido}` : id;

    const existeEnCarrito = carrito.find(p => p.idCarrito === idUnicoCarrito);

    if (existeEnCarrito) {
        if (existeEnCarrito.cantidad < prod.stock) {
            existeEnCarrito.cantidad++;
            actualizarCarritoUI();
        } else {
            Swal.fire({
  icon: "warning", // Usamos warning porque es una advertencia, no un error grave
title: "Límite de stock",
text: `¡Ups! Solo tenemos ${prod.stock} unidades de stock.`
});
        }
    } else {
        if (prod.stock > 0) {
            carrito.push({ ...prod, nombre: nombreEnCarrito, idCarrito: idUnicoCarrito, cantidad: 1 });
            actualizarCarritoUI();
        } else {
            Swal.fire({
  icon: "error", // Aquí el ícono de error queda perfecto
title: "Agotado",
text: "¡Producto sin stock por el momento!"
});
        }
    }
}

// ⚠️ ESTA ERA LA FUNCIÓN QUE SE HABÍA BORRADO
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
            <strong>${p.nombre}</strong> <br>
            Cant: ${p.cantidad} - $${p.precio * p.cantidad} 
            <button onclick="eliminar(${index})" style="width: auto; padding: 2px 8px; margin-left: 10px; background: #666;">❌</button>
        `;
        lista.appendChild(li);
    });

    const total = carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    totalElemento.textContent = total;

    // Actualiza el circulito rojo del huesito
    const contador = document.getElementById("contador-carrito");
    if(contador) {
        const totalItems = carrito.reduce((acc, p) => acc + p.cantidad, 0);
        contador.innerText = totalItems;
    }

    localStorage.setItem("carritoPistacha", JSON.stringify(carrito));
}

function eliminar(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

function agregarServicioGuarderia() {
    const tipo = document.getElementById("tipo-guarderia").value; 
    const cantidad = parseInt(document.getElementById("cantidad-guarderia").value) || 1;
    const fechaInput = document.getElementById("fecha-guarderia").value; // 👈 ¡Atrapamos la fecha!
    
    let precioFinal = 0;
    let nombreServicio = "";

    // Armamos un texto lindo para la fecha si es que el cliente la seleccionó
    let fechaTexto = "";
    if (fechaInput) {
        const partes = fechaInput.split("-");
        fechaTexto = ` (Ingreso: ${partes[2]}/${partes[1]}/${partes[0]})`; // Lo pasa a formato DD/MM/AAAA
    } else {
        alert("Por favor, selecciona una fecha de ingreso para la guardería.");
        return; // Frena la función si no pusieron fecha
    }

    switch (tipo) {
        case "hora":
            precioFinal = cantidad * TARIFAS.HORA;
            if (cantidad > 4) {
                precioFinal = precioFinal * 0.85; 
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
            alert("Los packs mensuales de paseos se coordinan directamente por WhatsApp.");
            return;
    }

    if (precioFinal > 0) {
        const servicio = {
            id: `SERV-${Date.now()}`,
            nombre: nombreServicio,
            precio: precioFinal,
            cantidad: 1 // Como es un servicio, la cantidad real ya está en el título
        };
        carrito.push(servicio);
        actualizarCarritoUI();
    Swal.fire({
  icon: "success", // Cambiamos a 'success' (éxito) porque es una acción positiva
title: "¡Genial!",
text: "¡Guardería agregada al carrito!",
  showConfirmButton: false, // Ocultamos el botón "Ok"
  timer: 1500 // Hacemos que se cierre sola en 1.5 segundos para no molestar al usuario
});
    }
}
// ==========================================
// 5. REGISTRO Y WHATSAPP 
// ==========================================
function registrarUsuario() {
    const nombre = document.getElementById("nombre").value;
    if (nombre) {
        localStorage.setItem("usuarioPistacha", nombre);
        verificarUsuario();
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
      icon: "info", // Ícono de información
    title: "Carrito vacío",
    text: "¡Agrega algunos snacks o días de guardería antes de finalizar tu pedido!"
    });
    return; 
}

    const nombreUser = localStorage.getItem("usuarioPistacha") || "Cliente";
    const opcionEntrega = document.querySelector('input[name="entrega"]:checked').value;

    let mensaje = `Hola Marisel! Soy ${nombreUser}, quiero hacer un pedido:%0A`;
    mensaje += `*Modalidad:* ${opcionEntrega}%0A%0A`;
    
    carrito.forEach(p => {
        mensaje += `- ${p.nombre} (Cant: ${p.cantidad} - $${p.precio * p.cantidad})%0A`;
    });
    
    mensaje += `%0A*Total: $${document.getElementById("total").textContent}*`;

    window.open(`https://wa.me/${MI_TELEFONO}?text=${mensaje}`, "_blank");
}

// ==========================================
// 6. FUNCIONES DEL MENÚ DESPLEGABLE
// ==========================================
function abrirCarrito() {
    document.getElementById("seccion-carrito").classList.add("abierto");
}

function cerrarCarrito() {
    document.getElementById("seccion-carrito").classList.remove("abierto");
}