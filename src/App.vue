<template>
  <div class="container">
    <div class="header">
      <h1>🏦 Calculadora de Amortización Acelerada</h1>
      <p>Simula pagos extras para reducir el tiempo de tu préstamo</p>
    </div>

    <div class="instructions">
      <h4>📝 Instrucciones:</h4>
      <p>• <strong>Cuota mínima:</strong> <span id="cuota-minima-msg">{{ formatCurrency(currentCuotaMinima) }}</span> cada mes<br>
        • <strong>Pagos extras:</strong> Modifica los montos en la columna "Tu Pago" para simular pagos
        mayores<br>
        • <strong>Botones rápidos:</strong> Usa los botones para aplicar el mismo monto a todas las cuotas<br>
        • <strong>Recalcular:</strong> Presiona "Recalcular" después de hacer cambios</p>
    </div>

    <div class="loan-info">
      <div class="info-card">
        <h3>Capital Prestado (Bs)</h3>
        <input type="number" v-model.number="capital" class="value value-input">
      </div>
      <div class="info-card">
        <h3>Tasa Anual (%)</h3>
        <input type="number" v-model.number="tasaAnual" class="value value-input">
      </div>
      <div class="info-card">
        <h3>Plazo Original (meses)</h3>
        <input type="number" v-model.number="plazo" class="value value-input">
      </div>
      <div class="info-card">
        <h3>Cuota Mínima</h3>
        <div class="value value-input">{{ formatCurrency(currentCuotaMinima) }}</div>
      </div>
    </div>

    <div class="quick-amounts">
      <button class="quick-btn" @click="fillAllPayments(2107)">Cuota Mínima (<span>{{ formatCurrency(currentCuotaMinima) }}</span>)</button>
      <button class="quick-btn" @click="fillAllPayments(3000)">3,000 Bs</button>
      <button class="quick-btn" @click="fillAllPayments(5000)">5,000 Bs</button>
      <button class="quick-btn" @click="fillAllPayments(8000)">8,000 Bs</button>
      <button class="quick-btn" @click="fillAllPayments(10000)">10,000 Bs</button>
    </div>

    <div class="controls">
      <button class="btn btn-success" @click="recalculate()">🔄 Recalcular Tabla</button>
      <button class="btn" @click="exportToCSV()">📊 Exportar CSV</button>
      <button class="btn" @click="printTable()">🖨️ Imprimir</button>
      <button class="btn btn-warning" @click="resetTablePayment()">↩️ Restablecer Tu Pago</button>
    </div>

    <div class="alert" v-if="alertMessage">{{ alertMessage }}</div>

    <div class="table-container">
      <div class="table-scroll">
        <table id="amortization-table">
          <thead>
            <tr>
              <th>Cuota</th>
              <th>Fecha</th>
              <th>Tu Pago</th>
              <th>Cuota Mín.</th>
              <th>Intereses</th>
              <th>A Capital</th>
              <th>Pago Extra</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in amortizationTable" :key="index" :class="{ 'pago-extra': row.pagoExtra > 1, 'prestamo-terminado': row.saldoPendiente <= 0.01 }">
              <td class="numero-cuota">{{ row.cuota }}</td>
              <td style="text-align: center;">{{ row.fecha }}</td>
              <td style="text-align: center;">
                <input type="number" class="pago-input" v-model.number="row.pagoUsuario" @change="recalculate()" :min="Math.round(currentCuotaMinima)" step="100">
              </td>
              <td class="amount min-amount">{{ formatCurrency(row.cuotaMinima) }}</td>
              <td class="amount">{{ formatCurrency(row.intereses) }}</td>
              <td class="amount">{{ formatCurrency(row.capitalPago) }}</td>
              <td class="amount amount-extra">{{ formatCurrency(row.pagoExtra) }}</td>
              <td class="amount">{{ formatCurrency(Math.max(0, row.saldoPendiente)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h3>Total a Pagar</h3>
        <div class="value value-input">{{ formatCurrency(summary.totalPagado) }}</div>
      </div>
      <div class="summary-card">
        <h3>Total Intereses</h3>
        <div class="value value-input">{{ formatCurrency(summary.totalIntereses) }}</div>
      </div>
      <div class="summary-card success">
        <h3>Tiempo Estimado</h3>
        <div class="value value-input">{{ summary.tiempoFinal }} meses</div>
      </div>
      <div class="summary-card success">
        <h3>Ahorro en Intereses</h3>
        <div class="value value-input">{{ formatCurrency(summary.ahorroIntereses) }}</div>
      </div>
      <div class="summary-card success">
        <h3>Tiempo Ahorrado</h3>
        <div class="value value-input">{{ summary.tiempoAhorrado }} meses</div>
      </div>
      <div class="summary-card success">
        <h3>Monto Total Extra</h3>
        <div class="value value-input">{{ formatCurrency(summary.totalExtra) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const capital = ref(107770);
const tasaAnual = ref(14);
const plazo = ref(48);
const amortizationTable = ref([]);
const alertMessage = ref('');

const summary = ref({
  totalPagado: 0,
  totalIntereses: 0,
  tiempoFinal: 0,
  ahorroIntereses: 0,
  tiempoAhorrado: 0,
  totalExtra: 0,
});

const currentCuotaMinima = computed(() => {
  if (capital.value <= 0 || tasaAnual.value <= 0 || plazo.value <= 0) return 0;
  const tasaMensual = (tasaAnual.value / 100) / 12;
  return capital.value * (tasaMensual * Math.pow(1 + tasaMensual, plazo.value)) / (Math.pow(1 + tasaMensual, plazo.value) - 1);
});

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount)) + ' Bs';
}

function calculateAmortization(capital, tasaAnual, meses) {
  const tasaMensual = (tasaAnual / 100) / 12;
  const cuotaMinimaCalculada = currentCuotaMinima.value;
  const newTable = [];
  let saldoPendiente = capital;
  let fechaInicio = new Date();

  for (let i = 1; i <= meses; i++) {
    const interesCuota = saldoPendiente * tasaMensual;
    const capitalCuota = Math.min(cuotaMinimaCalculada - interesCuota, saldoPendiente);
    const fechaCuota = new Date(fechaInicio);
    fechaCuota.setMonth(fechaCuota.getMonth() + i);
    const fechaRow = fechaCuota.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });

    newTable.push({
      cuota: i,
      fecha: fechaRow,
      pagoUsuario: Math.round(cuotaMinimaCalculada),
      cuotaMinima: cuotaMinimaCalculada,
      intereses: interesCuota,
      capitalPago: capitalCuota,
      pagoExtra: 0,
      saldoPendiente: saldoPendiente - capitalCuota
    });
    saldoPendiente -= capitalCuota;
  }
  amortizationTable.value = newTable;
}

function recalculate(resetPayInput = false) {
  if (isNaN(capital.value) || capital.value <= 0) { showAlert('Por favor, ingrese un Capital Prestado válido.'); return; }
  if (isNaN(tasaAnual.value) || tasaAnual.value <= 0) { showAlert('Por favor, ingrese una Tasa Anual válida.'); return; }
  if (isNaN(plazo.value) || plazo.value <= 0) { showAlert('Por favor, ingrese un Plazo Original válido.'); return; }

  const tasaMensual = (tasaAnual.value / 100) / 12;
  const cuotaMinimaCalculada = currentCuotaMinima.value;

  if (resetPayInput || amortizationTable.value.length !== plazo.value) {
      calculateAmortization(capital.value, tasaAnual.value, plazo.value);
  }

  let saldoPendiente = capital.value;
  let totalPagado = 0;
  let totalIntereses = 0;
  let cuotasUsadas = 0;
  let totalExtra = 0;

  const newTable = [...amortizationTable.value];

  for (let i = 0; i < newTable.length && saldoPendiente > 0.01; i++) {
    const row = newTable[i];
    let pagoUsuario = row.pagoUsuario;
    if (pagoUsuario < cuotaMinimaCalculada) {
      pagoUsuario = cuotaMinimaCalculada;
      row.pagoUsuario = Math.round(pagoUsuario);
    }

    const interesCuota = saldoPendiente * tasaMensual;
    const pagoEfectivo = Math.max(pagoUsuario, interesCuota + 0.01);
    const capitalDisponible = pagoEfectivo - interesCuota;
    const capitalPago = Math.min(capitalDisponible, saldoPendiente);
    const pagoExtra = Math.max(0, pagoEfectivo - cuotaMinimaCalculada);

    saldoPendiente -= capitalPago;
    totalPagado += pagoEfectivo;
    totalIntereses += interesCuota;
    totalExtra += pagoExtra;
    cuotasUsadas++;

    row.intereses = interesCuota;
    row.capitalPago = capitalPago;
    row.pagoExtra = pagoExtra;
    row.saldoPendiente = Math.max(0, saldoPendiente);

    if (saldoPendiente <= 0.01 && capitalPago < capitalDisponible) {
      const pagoFinalExacto = interesCuota + (saldoPendiente + capitalPago);
      row.pagoUsuario = Math.round(pagoFinalExacto);
      totalPagado = totalPagado - pagoEfectivo + pagoFinalExacto;
      saldoPendiente = 0;
    }
  }
  
  amortizationTable.value = newTable.slice(0, cuotasUsadas);
  updateSummary(totalPagado, totalIntereses, cuotasUsadas, capital.value, plazo.value, totalExtra);

  if (cuotasUsadas < plazo.value) {
    showAlert(`¡Felicidades! Terminarás de pagar tu préstamo en ${cuotasUsadas} meses en lugar de ${plazo.value} meses.`);
  } else {
    hideAlert();
  }
}

function updateSummary(totalPagado, totalIntereses, mesesUsados, originalCapital, originalMeses, totalExtra) {
  const tasaMensualOriginal = (tasaAnual.value / 100) / 12;
  const cuotaMinimaOriginal = originalCapital * (tasaMensualOriginal * Math.pow(1 + tasaMensualOriginal, originalMeses)) / (Math.pow(1 + tasaMensualOriginal, originalMeses) - 1);
  const interesesOriginales = (cuotaMinimaOriginal * originalMeses) - originalCapital;
  
  summary.value = {
    totalPagado,
    totalIntereses,
    tiempoFinal: mesesUsados,
    ahorroIntereses: interesesOriginales - totalIntereses,
    tiempoAhorrado: originalMeses - mesesUsados,
    totalExtra,
  };
}

function fillAllPayments(amount) {
  amortizationTable.value.forEach(row => {
    row.pagoUsuario = amount;
  });
  recalculate();
}

function resetTablePayment() {
  recalculate(true);
  hideAlert();
}

function showAlert(message) {
  alertMessage.value = message;
  setTimeout(hideAlert, 8000);
}

function hideAlert() {
  alertMessage.value = '';
}

function exportToCSV() {
  let csvContent = "Cuota,Fecha,Tu Pago,Cuota Minima,Intereses,A Capital,Pago Extra,Saldo\n";
  amortizationTable.value.forEach(row => {
    const csvRow = [
      row.cuota,
      row.fecha,
      row.pagoUsuario,
      formatCurrency(row.cuotaMinima),
      formatCurrency(row.intereses),
      formatCurrency(row.capitalPago),
      formatCurrency(row.pagoExtra),
      formatCurrency(row.saldoPendiente)
    ].join(',');
    csvContent += csvRow + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'tabla_amortizacion_personalizada.csv';
  link.click();
}

function printTable() {
  window.print();
}

onMounted(() => {
  calculateAmortization(capital.value, tasaAnual.value, plazo.value);
  recalculate();
});

</script>

<style>
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 20px;
  min-height: 100vh;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 30px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  color: #2c3e50;
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loan-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.info-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 20px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  transform: translateY(0);
  transition: transform 0.3s ease;
}

.info-card:hover {
  transform: translateY(-5px);
}

.info-card h3 {
  margin: 0 0 10px 0;
  font-size: 1.1em;
  opacity: 0.9;
}

.info-card .value {
  font-size: 1.8em;
  font-weight: bold;
}

.controls {
  margin-bottom: 20px;
  text-align: center;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #28a745, #20c997);
  box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
}

.btn-warning {
  background: linear-gradient(135deg, #ffc107, #fd7e14);
  box-shadow: 0 5px 15px rgba(255, 193, 7, 0.3);
}

.quick-amounts {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.quick-btn {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.quick-btn:hover {
  transform: scale(1.05);
}

.table-container {
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 15px 8px;
  text-align: center;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 14px;
}

td {
  padding: 12px 8px;
  text-align: right;
  border-bottom: 1px solid #eee;
  transition: background-color 0.3s ease;
  font-size: 14px;
}

tr:nth-child(even) {
  background-color: #f8f9ff;
}

tr:hover {
  background-color: #e3e8ff;
}

.numero-cuota {
  text-align: center;
  font-weight: bold;
  color: #667eea;
}

.amount {
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

.pago-input {
  width: 90px;
  padding: 5px;
  border: 2px solid #ddd;
  border-radius: 5px;
  text-align: right;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  background: #f8f9ff;
  transition: border-color 0.3s ease;
}

.pago-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
}

.value-input {
  width: 100%;
  padding: 4px;
  border: 2px solid #ddd;
  border-radius: 5px;
  text-align: right;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  /* background: #f8f9ff; */
  transition: border-color 0.3s ease;
}

.value-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
}

.pago-extra {
  background-color: #e8f5e8 !important;
}

.prestamo-terminado {
  background-color: #fff3cd !important;
  font-style: italic;
  color: #856404;
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.summary-card {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  padding: 20px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 20px rgba(255, 107, 107, 0.3);
}

.summary-card.success {
  background: linear-gradient(135deg, #28a745, #20c997);
  box-shadow: 0 10px 20px rgba(40, 167, 69, 0.3);
}

.summary-card h3 {
  margin: 0 0 10px 0;
  opacity: 0.9;
  font-size: 1em;
}

.summary-card .value {
  font-size: 1.4em;
  font-weight: bold;
}

.alert {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  padding: 15px;
  border-radius: 10px;
  margin: 20px 0;
  text-align: center;
  font-weight: bold;
}

@media (max-width: 768px) {
  .container {
    padding: 15px;
    margin: 10px;
  }

  table {
    font-size: 12px;
  }

  th,
  td {
    padding: 6px 4px;
  }

  .pago-input {
    width: 70px;
    font-size: 12px;
  }
}

.table-scroll {
  max-height: 70vh;
  overflow-y: auto;
}

.instructions {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 15px;
  margin: 20px 0;
  border-radius: 5px;
}

.instructions h4 {
  margin: 0 0 10px 0;
  color: #1976d2;
}
</style>
