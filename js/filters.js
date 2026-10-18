export function createFilterState() {
  return {
    radius: 100,
    magnitudes: new Set(["6-6.9", "7-7.9", "8+"]),
    yearStart: 1990,
    yearEnd: 2023,
  };
}

export function bindFilterControls(state, onChange) {
  const radiusInput = document.getElementById("radius-input");
  const radiusValue = document.getElementById("radius-value");
  const magnitudeInputs = document.querySelectorAll('input[name="magnitude"]');
  const yearStartInput = document.getElementById("year-start");
  const yearEndInput = document.getElementById("year-end");
  const yearStartValue = document.getElementById("year-start-value");
  const yearEndValue = document.getElementById("year-end-value");
  const rangeTrack = document.querySelector(".range-track");

  const notify = () => {
    if (typeof onChange === "function") {
      onChange({
        ...state,
        magnitudes: new Set(state.magnitudes),
      });
    }
  };

  const updateRadius = (value) => {
    state.radius = Number(value);
    radiusValue.textContent = `${state.radius} km`;
  };

  const updateYears = () => {
    state.yearStart = Number(yearStartInput.value);
    state.yearEnd = Number(yearEndInput.value);
    if (state.yearStart > state.yearEnd) {
      if (document.activeElement === yearStartInput) {
        state.yearEnd = state.yearStart;
        yearEndInput.value = String(state.yearEnd);
      } else {
        state.yearStart = state.yearEnd;
        yearStartInput.value = String(state.yearStart);
      }
    }
    yearStartValue.textContent = state.yearStart;
    yearEndValue.textContent = state.yearEnd;
    updateRangeTrack();
  };

  const updateRangeTrack = () => {
    if (!rangeTrack) return;
    rangeTrack.style.background = "transparent";
  };

  if (radiusInput) {
    updateRadius(radiusInput.value);
    radiusInput.addEventListener("input", (evt) => {
      updateRadius(evt.target.value);
    });
    radiusInput.addEventListener("change", () => notify());
  }

  if (magnitudeInputs.length) {
    magnitudeInputs.forEach((input) => {
      input.addEventListener("change", (evt) => {
        const value = evt.target.value;
        if (evt.target.checked) {
          state.magnitudes.add(value);
        } else {
          state.magnitudes.delete(value);
        }
        notify();
      });
    });
  }

  if (yearStartInput && yearEndInput) {
    updateYears();
    yearStartInput.addEventListener("input", () => {
      updateYears();
    });
    yearEndInput.addEventListener("input", () => {
      updateYears();
    });
    yearStartInput.addEventListener("change", () => notify());
    yearEndInput.addEventListener("change", () => notify());
  }

  // Emit initial state
  notify();
  updateRangeTrack();

  return {
    getState: () => ({
      ...state,
      magnitudes: new Set(state.magnitudes),
    }),
    setRadius(value) {
      radiusInput.value = value;
      updateRadius(value);
      notify();
    },
    setYearRange(start, end) {
      yearStartInput.value = start;
      yearEndInput.value = end;
      updateYears();
      notify();
      updateRangeTrack();
    },
  };
}
