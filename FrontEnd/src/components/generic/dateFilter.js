import { useLocation, useNavigate } from "react-router-dom";

export const DateFilter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const selectedDate = searchParams.get("fecha") || "";

  const handleDateChange = (e) => {
    const fecha = e.target.value;

    if (fecha) {
      searchParams.set("fecha", fecha);
    } else {
      searchParams.delete("fecha");
    }

    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="hidden sm:inline text-yellow-400 font-bold text-sm whitespace-nowrap">
        Fecha
      </label>
      <input
        type="date"
        value={selectedDate}
        onChange={handleDateChange}
        className="w-[170px] max-w-full bg-blue-900 text-gray-50
                text-sm border border-gray-300 rounded p-2 focus:outline-none
                focus:ring-2 focus:ring-yellow-400"
      />
    </div>
  );
};

export default DateFilter;
