// Configuración del sistema
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw_K1qKBscck6Aj5gFa67anCwbd5Z7LKpbnufgcFZJ4AI3N1FjcHk7xwfIaX1ZHT07PjQ/exec';

// Claves para localStorage
const CITA_STORAGE_KEY = 'consultorio_citas_alterna';
const CLIENT_STORAGE_KEY = 'consultorio_clientes';

// Variables globales
let currentClientId = null;
let isAdminLoggedIn = false;

// ========== BASE DE DATOS ALTERNA (LOCALSTORAGE) ==========

// Inicializar o cargar base de citas desde localStorage
function initCitasAlterna() {
    const citas = localStorage.getItem(CITA_STORAGE_KEY);
    return citas ? JSON.parse(citas) : [];
}

// Guardar base de citas en localStorage
function saveCitasAlterna(citas) {
    localStorage.setItem(CITA_STORAGE_KEY, JSON.stringify(citas));
    
    // También guardar como archivo de respaldo para VS Code
    guardarArchivoRespaldo(citas);
    
    return true;
}

// Guardar archivo de respaldo (solo para desarrollo en VS Code)
function guardarArchivoRespaldo(citas) {
    try {
        let contenido = '=== BASE DE DATOS ALTERNA DE CITAS ===\n';
        contenido += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
        contenido += `Total registros: ${citas.length}\n\n`;
        
        citas.forEach((cita, index) => {
            contenido += `[${index + 1}] ${cita.fecha} ${cita.hora} - ${cita.cedula} - ${cita.nombre || 'Sin nombre'}\n`;
        });
        
        console.log('📁 Base alterna actualizada:', citas.length, 'registros');
        console.log(contenido);
        
        // Crear blob para posible descarga
        if (window.location.hostname === 'localhost') {
            const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `citas_backup_${Date.now()}.txt`;
            link.click();
            URL.revokeObjectURL(url);
        }
        
    } catch (error) {
        console.error('Error al guardar respaldo:', error);
    }
}

// ========== FUNCIONES DE NORMALIZACIÓN CRÍTICAS ==========

// FUNCIÓN PRINCIPAL: Normalizar hora de cualquier formato a HH:mm
function normalizarHora(horaInput) {
    console.log('🕒 Entrada hora para normalizar:', horaInput, 'Tipo:', typeof horaInput);
    
    if (!horaInput || horaInput === '') {
        return '';
    }
    
    // Caso 1: Si ya es HH:mm
    if (typeof horaInput === 'string' && /^\d{2}:\d{2}$/.test(horaInput)) {
        return horaInput;
    }
    
    let horaStr = horaInput.toString().trim();
    
    // Caso 2: Si es objeto Date
    if (horaInput instanceof Date) {
        const horas = String(horaInput.getHours()).padStart(2, '0');
        const minutos = String(horaInput.getMinutes()).padStart(2, '0');
        return `${horas}:${minutos}`;
    }
    
    // Caso 3: Formato Google Sheets (Sat Dec 30 1899 09:00:00 GMT-0500)
    if (horaStr.includes('1899') || horaStr.includes('Dec 30')) {
        const match = horaStr.match(/(\d{1,2}):(\d{2})/);
        if (match) {
            const horas = String(parseInt(match[1])).padStart(2, '0');
            const minutos = match[2].padStart(2, '0');
            return `${horas}:${minutos}`;
        }
    }
    
    // Caso 4: Formato con AM/PM
    const ampmMatch = horaStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) {
        let horas = parseInt(ampmMatch[1]);
        const minutos = ampmMatch[2];
        const esPM = ampmMatch[3].toUpperCase() === 'PM';
        
        if (esPM && horas < 12) horas += 12;
        if (!esPM && horas === 12) horas = 0;
        
        return `${String(horas).padStart(2, '0')}:${minutos}`;
    }
    
    // Caso 5: Solo números (9, 10, etc.)
    if (/^\d{1,2}$/.test(horaStr)) {
        return `${String(parseInt(horaStr)).padStart(2, '0')}:00`;
    }
    
    // Caso 6: HH:mm con espacios
    const simpleMatch = horaStr.match(/(\d{1,2}):(\d{2})/);
    if (simpleMatch) {
        const horas = String(parseInt(simpleMatch[1])).padStart(2, '0');
        const minutos = simpleMatch[2].padStart(2, '0');
        return `${horas}:${minutos}`;
    }
    
    // Caso 7: H:mm (hora sin cero)
    const hmmMatch = horaStr.match(/(\d{1,2}):(\d{2})/);
    if (hmmMatch) {
        const horas = String(parseInt(hmmMatch[1])).padStart(2, '0');
        const minutos = hmmMatch[2].padStart(2, '0');
        return `${horas}:${minutos}`;
    }
    
    console.warn('⚠️ Formato de hora no reconocido:', horaInput);
    return '';
}

// Normalizar fecha a YYYY-MM-DD
function normalizarFecha(fechaInput) {
    if (!fechaInput) return '';
    
    // Si ya es YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaInput)) {
        return fechaInput;
    }
    
    try {
        // Intentar parsear como fecha
        const fecha = new Date(fechaInput);
        if (!isNaN(fecha.getTime())) {
            const año = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            return `${año}-${mes}-${dia}`;
        }
    } catch (e) {
        console.warn('Error al normalizar fecha:', e);
    }
    
    return fechaInput;
}

// Limpiar cédula (solo números)
function limpiarCedula(cedula) {
    if (!cedula) return '';
    return cedula.toString().replace(/\D/g, '');
}

// Formatear fecha para mostrar (DD/MM/YYYY)
function formatearFechaParaMostrar(fecha) {
    if (!fecha) return '';
    
    const fechaNormalizada = normalizarFecha(fecha);
    if (!fechaNormalizada) return fecha;
    
    const [año, mes, dia] = fechaNormalizada.split('-');
    return `${dia}/${mes}/${año}`;
}

// ========== VALIDACIÓN DE DISPONIBILIDAD ==========

// Verificar si un horario está disponible en base alterna
function verificarDisponibilidadBaseAlterna(fecha, hora) {
    const citas = initCitasAlterna();
    const fechaNormalizada = normalizarFecha(fecha);
    const horaNormalizada = normalizarHora(hora);
    
    if (!fechaNormalizada || !horaNormalizada) {
        return { disponible: false, motivo: 'Formato inválido' };
    }
    
    // Buscar coincidencia exacta
    const ocupada = citas.some(cita => 
        cita.fecha === fechaNormalizada && 
        cita.hora === horaNormalizada
    );
    
    if (ocupada) {
        // Encontrar quién tiene la cita
        const citaOcupada = citas.find(cita => 
            cita.fecha === fechaNormalizada && 
            cita.hora === horaNormalizada
        );
        
        return {
            disponible: false,
            motivo: 'horario_ocupado',
            cedulaOcupante: citaOcupada?.cedula || 'Desconocido',
            nombreOcupante: citaOcupada?.nombre || 'Desconocido'
        };
    }
    
    return { disponible: true };
}

// Registrar cita en base alterna
function registrarEnBaseAlterna(cedula, nombre, fecha, hora) {
    const citas = initCitasAlterna();
    const fechaNormalizada = normalizarFecha(fecha);
    const horaNormalizada = normalizarHora(hora);
    
    if (!cedula || !fechaNormalizada || !horaNormalizada) {
        console.error('❌ Datos inválidos para registrar en base alterna');
        return false;
    }
    
    // Verificar que no exista ya
    const existe = citas.some(cita => 
        cita.fecha === fechaNormalizada && 
        cita.hora === horaNormalizada
    );
    
    if (existe) {
        console.error('❌ Ya existe esta cita en base alterna');
        return false;
    }
    
    // Agregar nueva cita
    citas.push({
        cedula: limpiarCedula(cedula),
        nombre: nombre || 'Cliente no identificado',
        fecha: fechaNormalizada,
        hora: horaNormalizada,
        timestamp: new Date().toISOString(),
        origen: 'sistema'
    });
    
    saveCitasAlterna(citas);
    console.log('✅ Registrado en base alterna:', { cedula, fecha: fechaNormalizada, hora: horaNormalizada });
    return true;
}

// Eliminar cita de base alterna
function eliminarDeBaseAlterna(cedula, fecha, hora) {
    const citas = initCitasAlterna();
    const fechaNormalizada = normalizarFecha(fecha);
    const horaNormalizada = normalizarHora(hora);
    
    if (!cedula || !fechaNormalizada || !horaNormalizada) {
        return false;
    }
    
    const cedulaLimpia = limpiarCedula(cedula);
    const nuevasCitas = citas.filter(cita => 
        !(cita.cedula === cedulaLimpia && 
          cita.fecha === fechaNormalizada && 
          cita.hora === horaNormalizada)
    );
    
    if (citas.length !== nuevasCitas.length) {
        saveCitasAlterna(nuevasCitas);
        console.log('🗑️ Eliminado de base alterna:', { cedula, fecha: fechaNormalizada, hora: horaNormalizada });
        return true;
    }
    
    return false;
}

// Obtener horas disponibles para una fecha
function obtenerHorasDisponibles(fecha) {
    const fechaNormalizada = normalizarFecha(fecha);
    if (!fechaNormalizada) return [];
    
    const todasHoras = [
        '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00'
    ];
    
    const citas = initCitasAlterna();
    const horasOcupadas = citas
        .filter(cita => cita.fecha === fechaNormalizada)
        .map(cita => cita.hora);
    
    return todasHoras.filter(hora => !horasOcupadas.includes(hora));
}

// ========== FUNCIONES DE UTILIDAD ==========

function showSection(sectionId) {
    document.querySelectorAll('.section, .admin-panel').forEach(section => {
        section.classList.add('hidden');
    });

    const sectionToShow = document.getElementById(sectionId);
    if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
    }

    document.querySelectorAll('.success-message, .error-message').forEach(msg => {
        msg.style.display = 'none';
    });

    document.querySelector('.nav-links').classList.remove('show');
    
    document.getElementById('appointment-message').innerHTML = '';
    document.getElementById('cancel-message').innerHTML = '';
    document.getElementById('login-message').innerHTML = '';
    document.getElementById('register-message').innerHTML = '';
    
    document.getElementById('schedule-section').classList.add('hidden');
    document.getElementById('citas-list-section').classList.add('hidden');
    document.getElementById('citas-list').innerHTML = '';
    
    currentClientId = null;
}

function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('show');
}

// ========== FUNCIÓN DE CONEXIÓN A GOOGLE SHEETS ==========

async function makeRequest(action, data = {}) {
    console.log(`📤 Enviando ${action}:`, data);
    
    const params = new URLSearchParams();
    params.append('action', action);
    
    Object.keys(data).forEach(key => {
        params.append(key, data[key]);
    });
    
    const url = `${SCRIPT_URL}?${params.toString()}`;
    console.log(`🔗 URL: ${url}`);
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        
        try {
            const jsonData = JSON.parse(text);
            console.log(`✅ Respuesta ${action}:`, jsonData);
            return jsonData;
        } catch (e) {
            console.error(`❌ Error parseando JSON:`, e);
            return { success: false, message: 'Error en formato de respuesta' };
        }
    } catch (error) {
        console.error(`❌ Error de conexión:`, error);
        return { success: false, message: 'Error de conexión. Intente nuevamente.' };
    }
}

// ========== REGISTRO DE CLIENTES ==========

document.getElementById('registration-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validación de edad
    const age = parseInt(document.getElementById('age').value);
    if (age < 1 || age > 120) {
        document.getElementById('register-message').innerHTML = 
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> La edad debe estar entre 1 y 120 años.</div>';
        return;
    }
    
    // Validación de teléfono
    const phoneNumber = document.getElementById('phone-number').value;
    if (!/^\d{7,15}$/.test(phoneNumber)) {
        document.getElementById('register-message').innerHTML = 
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> El número de teléfono debe tener entre 7 y 15 dígitos.</div>';
        return;
    }
    
    const cedulaLimpia = limpiarCedula(document.getElementById('id-number').value);
    if (!cedulaLimpia) {
        document.getElementById('register-message').innerHTML = 
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Por favor ingrese un número de cédula válido.</div>';
        return;
    }
    
    // Validación de email
    const email = document.getElementById('email').value.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
        document.getElementById('register-message').innerHTML = 
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Por favor ingrese un correo electrónico válido.</div>';
        return;
    }
    
    // CORREGIDO: Teléfono con + y apóstrofe para Google Sheets
    const phone = "'" + document.getElementById('country-code').value + ' ' + phoneNumber;
    
    const formData = {
        fullName: document.getElementById('full-name').value.trim(),
        idNumber: cedulaLimpia,
        email: email, // AGREGADO: Enviar email
        phone: phone, // Teléfono con + y apóstrofe
        birthdate: document.getElementById('birthdate').value,
        age: age
    };
    
    if (!formData.fullName || !formData.idNumber || !formData.email || !formData.phone || !formData.birthdate || !formData.age) {
        document.getElementById('register-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Complete todos los campos.</div>';
        return;
    }
    
    document.getElementById('register-message').innerHTML =
        '<div class="success-message"><i class="fas fa-spinner fa-spin"></i> Registrando...</div>';
    
    try {
        const result = await makeRequest('registerClient', formData);
        
        if (result.success) {
            document.getElementById('register-message').innerHTML =
                `<div class="success-message"><i class="fas fa-check-circle"></i> ${result.message}</div>`;
            this.reset();
            document.getElementById('country-code').value = '+57';
            
            // Auto-redirigir a agendar cita con la cédula prellenada
            setTimeout(() => {
                showSection('appointment');
                document.getElementById('client-id').value = cedulaLimpia;
            }, 2000);
        } else {
            document.getElementById('register-message').innerHTML =
                `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${result.message}</div>`;
        }
    } catch (error) {
        document.getElementById('register-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error de conexión.</div>';
    }
});

// ========== VERIFICACIÓN DE CLIENTE ==========

document.getElementById('verify-client-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const clientId = limpiarCedula(document.getElementById('client-id').value);

    if (!clientId) {
        document.getElementById('appointment-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Ingrese una cédula válida.</div>';
        return;
    }

    document.getElementById('appointment-message').innerHTML =
        '<div class="success-message"><i class="fas fa-spinner fa-spin"></i> Verificando...</div>';

    try {
        const result = await makeRequest('verifyClient', { idNumber: clientId });
        
        if (result.success) {
            document.getElementById('appointment-message').innerHTML =
                `<div class="success-message"><i class="fas fa-check-circle"></i> Cliente verificado: ${result.clientName}</div>`;
            currentClientId = clientId;
            document.getElementById('schedule-section').classList.remove('hidden');
            loadAvailableTimeSlots();
        } else {
            document.getElementById('appointment-message').innerHTML =
                `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${result.message}</div>`;
        }
    } catch (error) {
        document.getElementById('appointment-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error de conexión.</div>';
    }
});

// ========== AGENDAMIENTO DE CITAS ==========

function loadAvailableTimeSlots() {
    const dateInput = document.getElementById('appointment-date');
    const timeSelect = document.getElementById('appointment-time');

    timeSelect.innerHTML = '<option value="">Cargando...</option>';

    if (!dateInput.value) {
        timeSelect.innerHTML = '<option value="">Seleccione fecha primero</option>';
        return;
    }

    // Usar base alterna para obtener horarios disponibles
    const horasDisponibles = obtenerHorasDisponibles(dateInput.value);
    
    timeSelect.innerHTML = '<option value="">Seleccione hora</option>';
    
    if (horasDisponibles.length > 0) {
        horasDisponibles.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            // Mostrar formato legible (9:00 en lugar de 09:00)
            const partes = hora.split(':');
            const horaMostrar = `${parseInt(partes[0])}:${partes[1]}`;
            option.textContent = horaMostrar;
            timeSelect.appendChild(option);
        });
    } else {
        timeSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
    }
}

document.getElementById('appointment-date').addEventListener('change', loadAvailableTimeSlots);

// AGENDAR CITA
document.getElementById('appointment-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;

    if (!date || !time) {
        document.getElementById('appointment-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Seleccione fecha y hora.</div>';
        return;
    }

    if (!currentClientId) {
        document.getElementById('appointment-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Verifique su cédula primero.</div>';
        return;
    }

    // ========== VALIDACIÓN EN BASE ALTERNA (PASO CRÍTICO) ==========
    const validacionBase = verificarDisponibilidadBaseAlterna(date, time);
    
    if (!validacionBase.disponible) {
        if (validacionBase.motivo === 'horario_ocupado') {
            // Obtener horas alternativas
            const horasAlternativas = obtenerHorasDisponibles(date);
            mostrarErrorHorarioOcupado(date, time, horasAlternativas, validacionBase);
        } else {
            document.getElementById('appointment-message').innerHTML =
                '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error en formato de fecha/hora.</div>';
        }
        return;
    }

    document.getElementById('appointment-message').innerHTML =
        '<div class="success-message"><i class="fas fa-spinner fa-spin"></i> Agendando...</div>';

    try {
        // Obtener nombre del cliente primero
        const clienteResult = await makeRequest('verifyClient', { idNumber: currentClientId });
        
        if (!clienteResult.success) {
            document.getElementById('appointment-message').innerHTML =
                '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Cliente no encontrado.</div>';
            return;
        }

        const nombreCliente = clienteResult.clientName || 'Cliente';

        // ========== REGISTRAR EN BASE ALTERNA PRIMERO ==========
        const registroAlterna = registrarEnBaseAlterna(currentClientId, nombreCliente, date, time);
        
        if (!registroAlterna) {
            document.getElementById('appointment-message').innerHTML =
                '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error al reservar horario.</div>';
            return;
        }

        // ========== ENVIAR A GOOGLE SHEETS ==========
        const result = await makeRequest('scheduleAppointment', {
            idNumber: currentClientId,
            date: date,
            time: time
        });
        
        if (result.success) {
            document.getElementById('appointment-message').innerHTML = `
                <div class="success-message" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 1.5rem; border-radius: 8px;">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <div style="background-color: white; color: #28a745; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 1.5rem;">
                            <i class="fas fa-check"></i>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 1.3rem;">¡CITA AGENDADA!</h3>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">${result.message}</p>
                        </div>
                    </div>
                    <div style="background-color: rgba(255,255,255,0.1); padding: 1rem; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;">
                            <i class="fas fa-calendar-day"></i> <strong>Fecha:</strong> ${formatearFechaParaMostrar(date)}
                        </p>
                        <p style="margin: 0;">
                            <i class="fas fa-clock"></i> <strong>Hora:</strong> ${time}
                        </p>
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 10px;">
                        <i class="fas fa-database"></i> Registrado en base local y Google Sheets
                    </div>
                </div>`;
            
            this.reset();
            document.getElementById('verify-client-form').reset();
            document.getElementById('schedule-section').classList.add('hidden');
            currentClientId = null;

            setTimeout(() => showSection('home'), 4000);
            
        } else {
            // Si falla Google Sheets, eliminar de base alterna
            eliminarDeBaseAlterna(currentClientId, date, time);
            
            if (result.tipoError === 'horario_ocupado') {
                // Esto no debería pasar porque ya validamos en base alterna
                const horasAlternativas = obtenerHorasDisponibles(date);
                mostrarErrorHorarioOcupado(date, time, horasAlternativas);
            } else {
                document.getElementById('appointment-message').innerHTML =
                    `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${result.message}</div>`;
            }
        }
    } catch (error) {
        // Si hay error, eliminar de base alterna
        eliminarDeBaseAlterna(currentClientId, date, time);
        document.getElementById('appointment-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error de conexión.</div>';
    }
});

function mostrarErrorHorarioOcupado(fecha, hora, horasAlternativas = [], validacion = {}) {
    const fechaFormateada = formatearFechaParaMostrar(fecha);
    const horaFormateada = hora.includes(':') ? hora : normalizarHora(hora);
    
    let mensajeHTML = `
        <div class="error-message" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 1.5rem; border-radius: 8px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="background-color: white; color: #dc3545; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 1.5rem;">
                    <i class="fas fa-times"></i>
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 1.3rem;">HORARIO NO DISPONIBLE</h3>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Este horario ya está tomado, por favor seleccione otra hora u otro día.</p>
                </div>
            </div>
            
            <div style="background-color: rgba(255,255,255,0.1); padding: 1rem; border-radius: 6px; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-size: 1.1rem;">
                    <i class="fas fa-calendar-day"></i> <strong>${fechaFormateada}</strong> a las <strong>${horaFormateada}</strong>
                </p>`;
    
    if (validacion.cedulaOcupante) {
        mensajeHTML += `
                <p style="margin: 0; font-size: 0.9rem; opacity: 0.8;">
                    <i class="fas fa-user"></i> Reservado por: ${validacion.nombreOcupante} (${validacion.cedulaOcupante})
                </p>`;
    }
    
    mensajeHTML += `</div>`;
    
    if (horasAlternativas && horasAlternativas.length > 0) {
        mensajeHTML += `
            <div style="margin-top: 20px;">
                <p style="font-weight: bold; margin-bottom: 15px; font-size: 1.1rem; opacity: 0.9;">
                    <i class="fas fa-clock"></i> Horas disponibles para ${fechaFormateada}:
                </p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">`;
        
        horasAlternativas.forEach(horaAlt => {
            const partes = horaAlt.split(':');
            const horaMostrar = `${parseInt(partes[0])}:${partes[1]}`;
            mensajeHTML += `
                <button type="button" onclick="seleccionarHoraAlternativa('${horaAlt}')" 
                        style="padding: 12px; background: rgba(255,255,255,0.9); color: #28a745; border: 2px solid #28a745; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: bold; transition: all 0.2s;"
                        onmouseover="this.style.background='#28a745'; this.style.color='white';"
                        onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.color='#28a745';">
                    ${horaMostrar}
                </button>`;
        });
        
        mensajeHTML += `</div>`;
    } else {
        mensajeHTML += `
            <div style="margin-top: 15px; padding: 12px; background-color: rgba(255,255,255,0.1); border-radius: 6px; text-align: center;">
                <p style="margin: 0;">
                    <i class="fas fa-calendar-times"></i> <strong>No hay horas disponibles para esta fecha</strong>
                </p>
                <p style="margin: 8px 0 0 0; opacity: 0.8;">Por favor seleccione otra fecha</p>
            </div>`;
    }
    
    mensajeHTML += `</div>`;
    document.getElementById('appointment-message').innerHTML = mensajeHTML;
}

function seleccionarHoraAlternativa(hora) {
    const timeSelect = document.getElementById('appointment-time');
    timeSelect.value = hora;
    
    const partes = hora.split(':');
    const horaMostrar = `${parseInt(partes[0])}:${partes[1]}`;
    
    document.getElementById('appointment-message').innerHTML = 
        `<div class="success-message">
            <i class="fas fa-check-circle"></i> Hora seleccionada: ${horaMostrar}
            <br><small>Haga clic en "Confirmar Cita" para agendar</small>
        </div>`;
}

// ========== CANCELACIÓN DE CITAS ==========

document.getElementById('cancel-verify-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const clientId = limpiarCedula(document.getElementById('cancel-client-id').value);

    if (!clientId) {
        document.getElementById('cancel-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Ingrese una cédula válida.</div>';
        return;
    }

    document.getElementById('cancel-message').innerHTML =
        '<div class="success-message"><i class="fas fa-spinner fa-spin"></i> Buscando citas...</div>';

    try {
        // Buscar en Google Sheets
        const result = await makeRequest('getAppointmentsByCedula', { idNumber: clientId });
        
        if (result.success && result.appointments && result.appointments.length > 0) {
            mostrarCitasCliente(result.appointments);
            document.getElementById('cancel-message').innerHTML =
                `<div class="success-message"><i class="fas fa-check-circle"></i> ${result.count} cita(s) encontrada(s).</div>`;
            document.getElementById('citas-list-section').classList.remove('hidden');
        } else {
            // También buscar en base alterna como respaldo
            const citasAlterna = initCitasAlterna();
            const citasCliente = citasAlterna.filter(cita => cita.cedula === clientId);
            
            if (citasCliente.length > 0) {
                mostrarCitasClienteAlterna(citasCliente);
                document.getElementById('cancel-message').innerHTML =
                    `<div class="success-message"><i class="fas fa-check-circle"></i> ${citasCliente.length} cita(s) encontrada(s) en base local.</div>`;
                document.getElementById('citas-list-section').classList.remove('hidden');
            } else {
                document.getElementById('cancel-message').innerHTML =
                    '<div class="error-message"><i class="fas fa-calendar-times"></i> No se encontraron citas.</div>';
            }
        }
    } catch (error) {
        document.getElementById('cancel-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error de conexión.</div>';
    }
});

function mostrarCitasCliente(citas) {
    const container = document.getElementById('citas-list');
    container.innerHTML = '';
    
    citas.forEach((cita, index) => {
        const horaNormalizada = normalizarHora(cita.time);
        const citaCard = document.createElement('div');
        citaCard.className = 'cita-card';
        citaCard.innerHTML = `
            <div class="cita-header">
                <i class="fas fa-calendar-alt"></i>
                <h4>Cita #${index + 1}</h4>
            </div>
            <div class="cita-info">
                <p><i class="fas fa-calendar-day"></i> <strong>Fecha:</strong> ${formatearFechaParaMostrar(cita.date)}</p>
                <p><i class="fas fa-clock"></i> <strong>Hora:</strong> ${horaNormalizada}</p>
                <p><i class="fas fa-user"></i> <strong>Cliente:</strong> ${cita.clientName || ''}</p>
                <p><i class="fas fa-database"></i> <strong>Fuente:</strong> Google Sheets</p>
            </div>
            <div class="cita-actions">
                <button class="btn btn-danger" onclick="cancelarCita('${cita.idNumber}', '${cita.date}', '${cita.time}')">
                    <i class="fas fa-trash-alt"></i> Cancelar
                </button>
            </div>
        `;
        container.appendChild(citaCard);
    });
}

function mostrarCitasClienteAlterna(citas) {
    const container = document.getElementById('citas-list');
    container.innerHTML = '';
    
    citas.forEach((cita, index) => {
        const citaCard = document.createElement('div');
        citaCard.className = 'cita-card';
        citaCard.innerHTML = `
            <div class="cita-header">
                <i class="fas fa-calendar-alt"></i>
                <h4>Cita #${index + 1}</h4>
            </div>
            <div class="cita-info">
                <p><i class="fas fa-calendar-day"></i> <strong>Fecha:</strong> ${formatearFechaParaMostrar(cita.fecha)}</p>
                <p><i class="fas fa-clock"></i> <strong>Hora:</strong> ${cita.hora}</p>
                <p><i class="fas fa-user"></i> <strong>Cliente:</strong> ${cita.nombre || ''}</p>
                <p><i class="fas fa-database"></i> <strong>Fuente:</strong> Base Local</p>
            </div>
            <div class="cita-actions">
                <button class="btn btn-danger" onclick="cancelarCitaAlterna('${cita.cedula}', '${cita.fecha}', '${cita.hora}')">
                    <i class="fas fa-trash-alt"></i> Cancelar
                </button>
            </div>
        `;
        container.appendChild(citaCard);
    });
}

async function cancelarCita(idNumber, date, time) {
    if (!confirm('¿Está seguro de cancelar esta cita?\nEsta acción eliminará la cita de ambos sistemas.')) return;

    document.getElementById('cancel-message').innerHTML =
        '<div class="success-message"><i class="fas fa-spinner fa-spin"></i> Cancelando...</div>';

    try {
        // 1. Eliminar de Google Sheets
        const result = await makeRequest('cancelAppointment', {
            idNumber: idNumber,
            date: date,
            time: time
        });
        
        // 2. Eliminar de base alterna (importante!)
        const eliminadoAlterna = eliminarDeBaseAlterna(idNumber, date, time);
        
        if (result.success) {
            let mensaje = result.message;
            if (eliminadoAlterna) {
                mensaje += ' (también eliminada de base local)';
            }
            
            document.getElementById('cancel-message').innerHTML =
                `<div class="success-message"><i class="fas fa-check-circle"></i> ${mensaje}</div>`;
            
            // Volver a cargar las citas
            const nuevasCitas = await makeRequest('getAppointmentsByCedula', { idNumber: idNumber });
            if (nuevasCitas.success && nuevasCitas.appointments.length > 0) {
                mostrarCitasCliente(nuevasCitas.appointments);
            } else {
                document.getElementById('citas-list-section').classList.add('hidden');
            }
        } else {
            document.getElementById('cancel-message').innerHTML =
                `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${result.message}</div>`;
        }
    } catch (error) {
        document.getElementById('cancel-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error de conexión.</div>';
    }
}

function cancelarCitaAlterna(cedula, fecha, hora) {
    if (!confirm('¿Está seguro de cancelar esta cita de la base local?')) return;

    document.getElementById('cancel-message').innerHTML =
        '<div class="success-message"><i class="fas fa-spinner fa-spin"></i> Cancelando...</div>';

    // Eliminar solo de base alterna
    const eliminado = eliminarDeBaseAlterna(cedula, fecha, hora);
    
    if (eliminado) {
        document.getElementById('cancel-message').innerHTML =
            '<div class="success-message"><i class="fas fa-check-circle"></i> Cita eliminada de base local.</div>';
        
        // Actualizar lista
        const citasAlterna = initCitasAlterna();
        const citasCliente = citasAlterna.filter(cita => cita.cedula === cedula);
        
        if (citasCliente.length > 0) {
            mostrarCitasClienteAlterna(citasCliente);
        } else {
            document.getElementById('citas-list-section').classList.add('hidden');
        }
    } else {
        document.getElementById('cancel-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-circle"></i> No se encontró la cita en base local.</div>';
    }
}

// ========== LOGIN ADMINISTRADOR ==========

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const data = {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    };

    document.getElementById('login-message').innerHTML =
        '<div class="success-message"><i class="fas fa-spinner fa-spin"></i> Iniciando sesión...</div>';

    try {
        const result = await makeRequest('adminLogin', data);
        
        if (result.success) {
            isAdminLoggedIn = true;
            document.getElementById('login-message').innerHTML =
                '<div class="success-message"><i class="fas fa-check-circle"></i> Login exitoso.</div>';
            showAdminPanel();
            loadAdminData();
        } else {
            document.getElementById('login-message').innerHTML =
                `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${result.message}</div>`;
        }
    } catch (error) {
        document.getElementById('login-message').innerHTML =
            '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error de conexión.</div>';
    }
});

// ========== PANEL ADMIN ==========

function showAdminPanel() {
    showSection('admin-panel');
}

function loadAdminData() {
    if (!isAdminLoggedIn) return;
    loadClients();
    loadAppointments();
    loadProcesses();
    
    // También mostrar estado de base alterna
    mostrarEstadoBaseAlterna();
    
    // ========== CONFIGURAR BOTONES DE PROCESOS ==========
    
    // Pequeño delay para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
        console.log("🔄 Configurando botones de procesos...");
        
        // 1. Configurar botones de procesos predefinidos (Acogida, Evaluación, etc.)
        const processButtons = document.querySelectorAll('.process-btn');
        console.log(`🔘 Encontrados ${processButtons.length} botones de procesos`);
        
        processButtons.forEach(btn => {
            // Limpiar event listener anterior (si existe)
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Agregar nuevo event listener
            newBtn.addEventListener('click', function() {
                console.log(`🖱️ Botón clickeado: ${this.getAttribute('data-process')}`);
                
                if (this.id === 'other-process-btn') {
                    // Si es el botón "Otro", mostrar el input personalizado
                    document.getElementById('other-process-input').classList.remove('hidden');
                    document.getElementById('custom-process').focus();
                } else {
                    // Si es un botón normal, pedir la cédula
                    const process = this.getAttribute('data-process');
                    addProcessToClient(process);
                }
            });
        });
        
        // 2. Configurar botón "Agregar" para proceso personalizado
        const addCustomBtn = document.getElementById('add-custom-process');
        if (addCustomBtn) {
            console.log("✅ Botón 'Agregar' encontrado");
            
            const newCustomBtn = addCustomBtn.cloneNode(true);
            addCustomBtn.parentNode.replaceChild(newCustomBtn, addCustomBtn);
            
            newCustomBtn.addEventListener('click', function() {
                console.log("🖱️ Botón 'Agregar' clickeado");
                
                const customProcess = document.getElementById('custom-process').value.trim();
                if (customProcess) {
                    addProcessToClient(customProcess);
                    document.getElementById('custom-process').value = '';
                    document.getElementById('other-process-input').classList.add('hidden');
                } else {
                    showNotification('Por favor ingrese un nombre para el proceso.', 'warning');
                }
            });
        } else {
            console.log("❌ Botón 'Agregar' NO encontrado");
        }
        
        console.log("✅ Botones de procesos configurados correctamente");
    }, 500); // Esperar 500ms para que el panel de admin cargue completamente
}

function mostrarEstadoBaseAlterna() {
    const citas = initCitasAlterna();
    const container = document.getElementById('admin-panel');
    
    const estadoDiv = document.createElement('div');
    estadoDiv.className = 'admin-info';
    estadoDiv.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h4><i class="fas fa-database"></i> Base de Datos Alterna</h4>
            <p><strong>Total registros:</strong> ${citas.length}</p>
            <p><strong>Última actualización:</strong> ${new Date().toLocaleString()}</p>
            <button class="btn btn-info btn-sm" onclick="exportarBaseAlterna()">
                <i class="fas fa-download"></i> Exportar Base
            </button>
            <button class="btn btn-warning btn-sm" onclick="limpiarBaseAlterna()" style="margin-left: 10px;">
                <i class="fas fa-trash"></i> Limpiar Base
            </button>
        </div>
    `;
    
    // Insertar al inicio del panel
    container.insertBefore(estadoDiv, container.firstChild);
}

function exportarBaseAlterna() {
    const citas = initCitasAlterna();
    let csv = 'Cédula,Nombre,Fecha,Hora,Timestamp,Origen\n';
    
    citas.forEach(cita => {
        csv += `"${cita.cedula}","${cita.nombre}","${cita.fecha}","${cita.hora}","${cita.timestamp}","${cita.origen}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `base_alterna_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function limpiarBaseAlterna() {
    if (confirm('⚠️ ¿Está seguro de limpiar toda la base de datos alterna?\nEsta acción no se puede deshacer.')) {
        localStorage.removeItem(CITA_STORAGE_KEY);
        alert('Base alterna limpiada correctamente.');
        mostrarEstadoBaseAlterna();
    }
}

async function loadClients() {
    const container = document.getElementById('clients-table-container');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
    
    try {
        const result = await makeRequest('getClients');
        
        if (result.success) {
            displayClientsTable(result.clients);
        } else {
            container.innerHTML = `<div class="error-message">${result.message}</div>`;
        }
    } catch (error) {
        container.innerHTML = '<div class="error-message">Error de conexión</div>';
    }
}

async function loadAppointments() {
    const container = document.getElementById('appointments-table-container');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
    
    try {
        const result = await makeRequest('getAppointments');
        
        if (result.success) {
            displayAppointmentsTable(result.appointments);
        } else {
            container.innerHTML = `<div class="error-message">${result.message}</div>`;
        }
    } catch (error) {
        container.innerHTML = '<div class="error-message">Error de conexión</div>';
    }
}

async function loadProcesses() {
    const container = document.getElementById('processes-table-container');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
    
    try {
        const result = await makeRequest('getProcesses');
        
        if (result.success) {
            displayProcessesTable(result.processes);
        } else {
            container.innerHTML = `<div class="error-message">${result.message}</div>`;
        }
    } catch (error) {
        container.innerHTML = '<div class="error-message">Error de conexión</div>';
    }
}

function refreshClients() { loadClients(); }
function refreshAppointments() { loadAppointments(); }
function refreshProcesses() { loadProcesses(); }

function displayClientsTable(clients) {
    const container = document.getElementById('clients-table-container');
    
    if (!clients || clients.length === 0) {
        container.innerHTML = '<div class="loading">No hay clientes</div>';
        return;
    }
    
    let html = '<table><thead><tr><th>Nombre</th><th>Cédula</th><th>Teléfono</th><th>Fecha Nac.</th><th>Edad</th></tr></thead><tbody>';
    
    clients.forEach(client => {
        html += `<tr>
            <td>${client.fullName || ''}</td>
            <td>${client.idNumber || ''}</td>
            <td>${client.phone || ''}</td>
            <td>${formatearFechaParaMostrar(client.birthdate)}</td>
            <td>${client.age || ''}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayAppointmentsTable(appointments) {
    const container = document.getElementById('appointments-table-container');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<div class="loading">No hay citas</div>';
        return;
    }
    
    let html = '<table><thead><tr><th>Cliente</th><th>Cédula</th><th>Fecha</th><th>Hora</th><th>Estado</th></tr></thead><tbody>';
    
    appointments.forEach(appointment => {
        const horaNormalizada = normalizarHora(appointment.time);
        html += `<tr>
            <td>${appointment.clientName || ''}</td>
            <td>${appointment.idNumber || ''}</td>
            <td>${formatearFechaParaMostrar(appointment.date)}</td>
            <td>${horaNormalizada}</td>
            <td><span class="status-badge">${appointment.status || 'pendiente'}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayProcessesTable(processes) {
    const container = document.getElementById('processes-table-container');
    
    if (!processes || processes.length === 0) {
        container.innerHTML = '<div class="loading">No hay procesos</div>';
        return;
    }
    
    let html = '<table><thead><tr><th>Cliente</th><th>Cédula</th><th>Proceso</th><th>Fecha</th></tr></thead><tbody>';
    
    processes.forEach(process => {
        html += `<tr>
            <td>${process.clientName || ''}</td>
            <td>${process.idNumber || ''}</td>
            <td>${process.process || ''}</td>
            <td>${formatearFechaParaMostrar(process.date)}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function logout() {
    isAdminLoggedIn = false;
    showSection('home');
}

function logout() {
    isAdminLoggedIn = false;
    showSection('home');
}

// ========== FUNCIÓN PARA AGREGAR PROCESO A CLIENTE ==========
function addProcessToClient(process) {
    const clientId = prompt("Ingrese la cédula del cliente:");
    if (!clientId) return;
    
    const clientIdLimpio = limpiarCedula(clientId);
    
    makeRequest('addProcess', {
        idNumber: clientIdLimpio,
        process: process
    })
    .then(result => {
        if (result.success) {
            showNotification('Proceso agregado exitosamente.', 'success');
            loadProcesses(); // Recargar la tabla de procesos
        } else {
            showNotification(`Error: ${result.message}`, 'error');
        }
    })
    .catch(error => {
        showNotification('Error al conectar con el servidor.', 'error');
    });
}

// ========== FUNCIÓN PARA MOSTRAR NOTIFICACIONES ==========
function showNotification(message, type = 'info') {
    // Crear estilos si no existen
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                color: white;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                z-index: 9999;
                transform: translateX(100%);
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.success {
                background: linear-gradient(135deg, #28a745, #20c997);
                border-left: 4px solid #1e7e34;
            }
            
            .notification.error {
                background: linear-gradient(135deg, #dc3545, #c82333);
                border-left: 4px solid #bd2130;
            }
            
            .notification.warning {
                background: linear-gradient(135deg, #ffc107, #e0a800);
                color: #212529;
                border-left: 4px solid #d39e00;
            }
            
            .notification.info {
                background: linear-gradient(135deg, #007bff, #0056b3);
                border-left: 4px solid #0056b3;
            }
        `;
        document.head.appendChild(style);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// ========== INICIALIZACIÓN ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema iniciado con base de datos alterna en localStorage');
    
    // Inicializar base de datos
    const citas = initCitasAlterna();
    console.log(`📊 Base alterna cargada: ${citas.length} citas registradas`);
    
    showSection('home');

    // Configurar fechas
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateInput = document.getElementById('appointment-date');
    if (dateInput) {
        dateInput.min = tomorrow.toISOString().split('T')[0];
        const maxDate = new Date(today);
        maxDate.setMonth(maxDate.getMonth() + 3);
        dateInput.max = maxDate.toISOString().split('T')[0];
    }

    const birthdateInput = document.getElementById('birthdate');
    if (birthdateInput) {
        const maxBirthdate = new Date();
        maxBirthdate.setFullYear(maxBirthdate.getFullYear() - 18);
        birthdateInput.max = maxBirthdate.toISOString().split('T')[0];

        const minBirthdate = new Date();
        minBirthdate.setFullYear(minBirthdate.getFullYear() - 100);
        birthdateInput.min = minBirthdate.toISOString().split('T')[0];
    }

    if (birthdateInput) {
        birthdateInput.addEventListener('change', function() {
            const ageInput = document.getElementById('age');
            if (ageInput) {
                const birthdate = new Date(this.value);
                const today = new Date();
                let age = today.getFullYear() - birthdate.getFullYear();
                const monthDiff = today.getMonth() - birthdate.getMonth();

                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
                    age--;
                }

                if (age > 0 && age <= 120) {
                    ageInput.value = age;
                }
            }
        });
    }
    
    // Verificar integridad de base alterna al iniciar
    verificarIntegridadBaseAlterna();
});

// Función para verificar integridad de la base alterna
function verificarIntegridadBaseAlterna() {
    const citas = initCitasAlterna();
    
    // Eliminar citas duplicadas (por si acaso)
    const citasUnicas = [];
    const vistas = new Set();
    
    citas.forEach(cita => {
        const clave = `${cita.fecha}|${cita.hora}|${cita.cedula}`;
        if (!vistas.has(clave)) {
            vistas.add(clave);
            citasUnicas.push(cita);
        }
    });
    
    if (citas.length !== citasUnicas.length) {
        console.log(`🔄 Eliminadas ${citas.length - citasUnicas.length} citas duplicadas`);
        saveCitasAlterna(citasUnicas);
    }
    
    // Verificar formatos
    citasUnicas.forEach(cita => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cita.fecha)) {
            console.warn(`⚠️ Fecha con formato incorrecto en base alterna: ${cita.fecha}`);
        }
        if (!/^\d{2}:\d{2}$/.test(cita.hora)) {
            console.warn(`⚠️ Hora con formato incorrecto en base alterna: ${cita.hora}`);
        }
    });
}