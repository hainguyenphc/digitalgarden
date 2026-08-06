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
