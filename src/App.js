import { ref, onMounted, computed } from 'vue';

export default {
  setup() {
    const capital = ref(107770);
    const tasaAnual = ref(14);
    const plazo = ref(48);
    const tasaSeguroAnual = ref(1.998);
    const amortizationTable = ref([]);
    const alertMessage = ref('');

    const summary = ref({
      totalPagado: 0,
      totalIntereses: 0,
      totalSeguro: 0,
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
      const tasaSeguroMensual = (tasaSeguroAnual.value / 100) / 12;
      const cuotaMinimaCalculada = currentCuotaMinima.value;
      const newTable = [];
      let saldoPendiente = capital;
      let fechaInicio = new Date();

      for (let i = 1; i <= meses; i++) {
        const interesCuota = saldoPendiente * tasaMensual;
        const seguroDesgravamen = saldoPendiente * tasaSeguroMensual;
        const capitalCuota = Math.min(cuotaMinimaCalculada - interesCuota, saldoPendiente);
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
        const fechaRow = fechaCuota.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });

        newTable.push({
          cuota: i,
          fecha: fechaRow,
          pagoUsuario: Math.round(cuotaMinimaCalculada + seguroDesgravamen),
          cuotaMinima: cuotaMinimaCalculada,
          intereses: interesCuota,
          capitalPago: capitalCuota,
          pagoExtra: 0,
          seguroDesgravamen: seguroDesgravamen,
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
      const tasaSeguroMensual = (tasaSeguroAnual.value / 100) / 12;
      const cuotaMinimaCalculada = currentCuotaMinima.value;

      if (resetPayInput || amortizationTable.value.length !== plazo.value) {
          calculateAmortization(capital.value, tasaAnual.value, plazo.value);
      }

      let saldoPendiente = capital.value;
      let totalPagado = 0;
      let totalIntereses = 0;
      let totalSeguro = 0;
      let cuotasUsadas = 0;
      let totalExtra = 0;

      const newTable = [...amortizationTable.value];

      for (let i = 0; i < newTable.length && saldoPendiente > 0.01; i++) {
        const row = newTable[i];
        const seguroDesgravamen = saldoPendiente * tasaSeguroMensual;
        row.seguroDesgravamen = seguroDesgravamen;

        let pagoUsuario = row.pagoUsuario;
        if (pagoUsuario < cuotaMinimaCalculada + seguroDesgravamen) {
          pagoUsuario = cuotaMinimaCalculada + seguroDesgravamen;
          row.pagoUsuario = Math.round(pagoUsuario);
        }

        const interesCuota = saldoPendiente * tasaMensual;
        const pagoEfectivo = Math.max(pagoUsuario, interesCuota + seguroDesgravamen + 0.01);
        const capitalDisponible = pagoEfectivo - interesCuota - seguroDesgravamen;
        const capitalPago = Math.min(capitalDisponible, saldoPendiente);
        const pagoExtra = Math.max(0, pagoEfectivo - (cuotaMinimaCalculada + seguroDesgravamen));

        saldoPendiente -= capitalPago;
        totalPagado += pagoEfectivo;
        totalIntereses += interesCuota;
        totalSeguro += seguroDesgravamen;
        totalExtra += pagoExtra;
        cuotasUsadas++;

        row.intereses = interesCuota;
        row.capitalPago = capitalPago;
        row.pagoExtra = pagoExtra;
        row.saldoPendiente = Math.max(0, saldoPendiente);

        if (saldoPendiente <= 0.01 && capitalPago < capitalDisponible) {
          const pagoFinalExacto = interesCuota + seguroDesgravamen + (saldoPendiente + capitalPago);
          row.pagoUsuario = Math.round(pagoFinalExacto);
          totalPagado = totalPagado - pagoEfectivo + pagoFinalExacto;
          saldoPendiente = 0;
        }
      }
      
      amortizationTable.value = newTable.slice(0, cuotasUsadas);
      updateSummary(totalPagado, totalIntereses, totalSeguro, cuotasUsadas, capital.value, plazo.value, totalExtra);

      if (cuotasUsadas < plazo.value) {
        showAlert(`¡Felicidades! Terminarás de pagar tu préstamo en ${cuotasUsadas} meses en lugar de ${plazo.value} meses.`);
      } else {
        hideAlert();
      }
    }

    function updateSummary(totalPagado, totalIntereses, totalSeguro, mesesUsados, originalCapital, originalMeses, totalExtra) {
      const tasaMensualOriginal = (tasaAnual.value / 100) / 12;
      const cuotaMinimaOriginal = originalCapital * (tasaMensualOriginal * Math.pow(1 + tasaMensualOriginal, originalMeses)) / (Math.pow(1 + tasaMensualOriginal, originalMeses) - 1);
      const interesesOriginales = (cuotaMinimaOriginal * originalMeses) - originalCapital;
      
      summary.value = {
        totalPagado,
        totalIntereses,
        totalSeguro,
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
      let csvContent = "Cuota,Fecha,Tu Pago,Cuota Minima,Intereses,A Capital,Pago Extra,Seguro Desgravamen,Saldo\n";
      amortizationTable.value.forEach(row => {
        const csvRow = [
          row.cuota,
          row.fecha,
          row.pagoUsuario,
          formatCurrency(row.cuotaMinima),
          formatCurrency(row.intereses),
          formatCurrency(row.capitalPago),
          formatCurrency(row.pagoExtra),
          formatCurrency(row.seguroDesgravamen),
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

    return {
      capital,
      tasaAnual,
      plazo,
      tasaSeguroAnual,
      amortizationTable,
      alertMessage,
      summary,
      currentCuotaMinima,
      formatCurrency,
      recalculate,
      fillAllPayments,
      resetTablePayment,
      exportToCSV,
      printTable,
    };
  },
};
