const range = (start, stop, step = 1) =>
	Array.from(
		{ length: Math.floor((stop - start) / step) + 1 },
		(_, i) => start + i * step,
	);

const kph_to_mph = (kph) => {
	const mph = kph * 0.621371;
	return mph.toFixed(2); // Rounds to 2 decimal places.
};

const kph_to_mins_per_km = (kph) => {
	const mins_per_km = 60 / kph;
	const minutes = Math.floor(mins_per_km);
	const seconds = Math.round((mins_per_km - minutes) * 60);
	return `${minutes}:${seconds.toString().padStart(2, "0")} min/km`;
};

const kph_to_mins_per_mile = (kph) => {
	const mins_per_mile = 60 / (kph * 0.621371);
	const minutes = Math.floor(mins_per_mile);
	const seconds = Math.round((mins_per_mile - minutes) * 60);
	return `${minutes}:${seconds.toString().padStart(2, "0")} min/mile`;
};

const kph_to_5k_time = (kph) => {
	const time_in_hours = 5 / kph;
	const total_minutes = time_in_hours * 60;
	const hours = Math.floor(total_minutes / 60);
	const minutes = Math.floor(total_minutes % 60);
	const seconds = Math.round((total_minutes - hours * 60 - minutes) * 60);
	return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const kph_to_10k_time = (kph) => {
	const time_in_hours = 10 / kph;
	const total_minutes = time_in_hours * 60;
	const hours = Math.floor(total_minutes / 60);
	const minutes = Math.floor(total_minutes % 60);
	const seconds = Math.round((total_minutes - hours * 60 - minutes) * 60);
	return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const kph_to_half_marathon_time = (kph) => {
	const time_in_hours = 21.0975 / kph;
	const total_minutes = time_in_hours * 60;
	const hours = Math.floor(total_minutes / 60);
	const minutes = Math.floor(total_minutes % 60);
	const seconds = Math.round((total_minutes - hours * 60 - minutes) * 60);
	return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const kph_to_marathon_time = (kph) => {
	const time_in_hours = 42.195 / kph;
	const total_minutes = time_in_hours * 60;
	const hours = Math.floor(total_minutes / 60);
	const minutes = Math.floor(total_minutes % 60);
	const seconds = Math.round((total_minutes - hours * 60 - minutes) * 60);
	return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const populate_running_pace_conversion_table = () => {
	cached_data = localStorage.getItem("running_pace_conversion_data");
	if (cached_data) {
		// console.log("Using cached data for running pace conversion table.");
		document.getElementById("running-pace-conversion-table-body").innerHTML =
			cached_data;
		return;
	}

	// console.log("Generating new data for running pace conversion table.");
	cached_data = "";

	cached_kilometres_per_hour_ranges = localStorage.getItem(
		"kilometres_per_hour_ranges",
	);
	if (cached_kilometres_per_hour_ranges) {
		// console.log("Using cached kilometres per hour ranges.");
		kilometres_per_hour_ranges = JSON.parse(cached_kilometres_per_hour_ranges);
	} else {
		// console.log("Generating new kilometres per hour ranges.");
		kilometres_per_hour_ranges = range(8, 21, 0.1).map((kph) =>
			Number(kph.toFixed(1)),
		);
		localStorage.setItem(
			"kilometres_per_hour_ranges",
			JSON.stringify(kilometres_per_hour_ranges),
		);
	}

	kilometres_per_hour_ranges.forEach((kph) => {
		const mph = kph_to_mph(kph);
		const mins_per_km = kph_to_mins_per_km(kph);
		const mins_per_mile = kph_to_mins_per_mile(kph);
		const _5k_time = kph_to_5k_time(kph);
		const _10k_time = kph_to_10k_time(kph);
		const _half_marathon_time = kph_to_half_marathon_time(kph);
		const _marathon_time = kph_to_marathon_time(kph);
		const table_row = `
    <tr>
      <td>${kph} kph</td>
      <td>${mph} mph</td>
      <td>${mins_per_km}</td>
      <td>${mins_per_mile}</td>
      <td>${_5k_time}</td>
      <td>${_10k_time}</td>
      <td>${_half_marathon_time}</td>
      <td>${_marathon_time}</td>
    </tr>`;
		cached_data += table_row;
		document
			.getElementById("running-pace-conversion-table-body")
			.insertAdjacentHTML("beforeend", table_row);
	});
	localStorage.setItem("running_pace_conversion_data", cached_data);
};

populate_running_pace_conversion_table();

// 1 mile in km
const MILE_KM = 1.609344;

// race distances in km
const DISTANCES = {
	"5k-time": 5,
	"10k-time": 10,
	"hm-time": 21.0975,
	"fm-time": 42.195,
};

const ALL_IDS = [
	"kph-input",
	"mph-input",
	"minutes-per-kilometre",
	"minutes-per-mile",
	"5k-time",
	"10k-time",
	"hm-time",
	"fm-time",
];

const TIME_FIELDS = Object.keys(DISTANCES); // 5k-time, 10k-time, hm-time, fm-time

function round2(n) {
	return Math.round(n * 100) / 100;
}

// Parse "HH:MM:SS" into total seconds.
// Returns null if the string isn't a complete, valid HH:MM:SS yet
// (so the user can keep typing without getting interrupted).
function parseHms(str) {
	const match = str.match(/^(\d{1,2}):([0-5]?\d):([0-5]?\d)$/);
	if (!match) {
		return null;
	}

	const hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	const seconds = parseInt(match[3], 10);

	return hours * 3600 + minutes * 60 + seconds;
}

// Format total seconds as "HH:MM:SS" with zero-padding.
function formatHms(totalSeconds) {
	totalSeconds = Math.round(totalSeconds);

	const hh = Math.floor(totalSeconds / 3600);
	const mm = Math.floor((totalSeconds % 3600) / 60);
	const ss = totalSeconds % 60;

	const pad = (n) => String(n).padStart(2, "0");

	return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

// Take whichever non-time field changed, and its raw numeric value,
// and figure out what kph that corresponds to.
function computeKph(id, value) {
	if (!value || value <= 0) {
		return null;
	}

	if (id === "kph-input") {
		return value;
	}

	if (id === "mph-input") {
		return value * MILE_KM;
	}

	if (id === "minutes-per-kilometre") {
		return 60 / value;
	}

	if (id === "minutes-per-mile") {
		const mph = 60 / value;
		return mph * MILE_KM;
	}

	return null;
}

// A time field (5k/10k/hm/fm) changed. Convert its HH:MM:SS string
// into kph, using that race's distance.
function computeKphFromTimeField(id, rawValue) {
	const totalSeconds = parseHms(rawValue);
	if (totalSeconds === null || totalSeconds <= 0) {
		return null;
	}

	const totalMinutes = totalSeconds / 60;
	const distanceKm = DISTANCES[id];
	const minPerKm = totalMinutes / distanceKm;

	return 60 / minPerKm;
}

// Given a kph value, compute what every field's value should be.
// Speed/pace fields are plain numbers; race time fields are seconds
// (to be formatted as HH:MM:SS).
function computeAllValues(kph) {
	const mph = kph / MILE_KM;
	const minPerKm = 60 / kph;
	const minPerMile = 60 / mph;

	return {
		"kph-input": kph,
		"mph-input": mph,
		"minutes-per-kilometre": minPerKm,
		"minutes-per-mile": minPerMile,
		"5k-time": minPerKm * DISTANCES["5k-time"] * 60,
		"10k-time": minPerKm * DISTANCES["10k-time"] * 60,
		"hm-time": minPerKm * DISTANCES["hm-time"] * 60,
		"fm-time": minPerKm * DISTANCES["fm-time"] * 60,
	};
}

// Write the computed values into every field except the one
// the user is actively typing in.
function updateFields(kph, excludeId) {
	const values = computeAllValues(kph);

	for (const id of ALL_IDS) {
		if (id === excludeId) {
			continue;
		}

		const field = document.getElementById(id);

		if (TIME_FIELDS.includes(id)) {
			field.value = formatHms(values[id]); // values[id] is seconds here
		} else {
			field.value = round2(values[id]);
		}
	}
}

function handleInput(event) {
	const id = event.target.id;
	const raw = event.target.value;

	let kph;
	if (TIME_FIELDS.includes(id)) {
		kph = computeKphFromTimeField(id, raw);
	} else {
		kph = computeKph(id, parseFloat(raw));
	}

	if (kph !== null && kph > 0 && isFinite(kph)) {
		updateFields(kph, id);
	}
}

for (const id of ALL_IDS) {
	document.getElementById(id).addEventListener("input", handleInput);
}
