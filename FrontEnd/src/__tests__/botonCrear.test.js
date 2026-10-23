// UI41: el botón "+" de crear aparece en Eventos y Emprendimientos (para
// admins y miembros del Banco de Profesionales) y nunca en Publicaciones.
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Publicaciones } from "../components/publicaciones";
import { useAuth } from "../components/context/AuthContext";

jest.mock("../components/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-hot-toast", () => ({ toast: { error: jest.fn(), success: jest.fn(), promise: jest.fn() } }));
// El Jest de react-scripts no resuelve los "exports" de react-router-dom v7.
jest.mock(
  "react-router-dom",
  () => ({
    useLocation: () => ({ pathname: "/", search: "" }),
    useNavigate: () => jest.fn(),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
  }),
  { virtual: true },
);

// Hijos pesados (mapas, calendario, carruseles) no son parte de esta prueba.
jest.mock("../pages/formulario", () => () => null);
jest.mock("../components/publicacionCard", () => () => null);
jest.mock("../components/eventoCard", () => () => null);
jest.mock("../components/publicacionModal", () => () => null);
jest.mock("../components/publicidadModal", () => () => null);
jest.mock("../components/generic/categoriaFilter", () => () => null);
jest.mock("../components/buscadorPublicaciones", () => () => null);
jest.mock("../components/AlertaLimitePublicaciones", () => () => null);
jest.mock("../components/limiteDePublicaciones", () => () => null);
jest.mock("../components/generic/dateFilter", () => () => null);
jest.mock("../components/generic/priceFilter", () => () => null);
jest.mock("../components/generic/comunidadFilter", () => () => null);
jest.mock("../components/CarruselGenerico", () => () => null);
jest.mock("../components/Calendar", () => () => null);

const ADMIN = { _id: "a1", nombre: "Admin", tipoUsuario: 0 };
const BASICO = { _id: "b1", nombre: "Basico", tipoUsuario: 2 };

const mockFetch = (enBanco) => {
  global.fetch = jest.fn((url) => {
    const body = String(url).includes("banco-profesionales/estado")
      ? { data: { enBancoProfesionales: enBanco } }
      : { data: [], pagination: { offset: 0, limit: 12, total: 0, pages: 0 } };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
};

const renderLista = (tag) => render(<Publicaciones tag={tag} />);

const BOTON = "Inspira a otros con tu talento";

beforeEach(() => {
  window.scrollTo = jest.fn(); // jsdom no implementa scroll
  jest.clearAllMocks();
  localStorage.setItem("token", "t");
});

describe.each(["evento", "emprendimiento"])("en %s", (tag) => {
  test("el admin ve el botón de crear", async () => {
    useAuth.mockReturnValue({ user: ADMIN });
    mockFetch(false);
    renderLista(tag);
    expect(await screen.findByText(BOTON)).toBeInTheDocument();
  });

  test("un miembro del banco ve el botón de crear", async () => {
    useAuth.mockReturnValue({ user: BASICO });
    mockFetch(true);
    renderLista(tag);
    expect(await screen.findByText(BOTON)).toBeInTheDocument();
  });

  test("un usuario básico fuera del banco no lo ve", async () => {
    useAuth.mockReturnValue({ user: BASICO });
    mockFetch(false);
    renderLista(tag);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText(BOTON)).not.toBeInTheDocument();
  });
});

describe("en publicacion", () => {
  test.each([
    ["el admin", ADMIN, false],
    ["un miembro del banco", BASICO, true],
  ])("%s no ve el botón: las publicaciones se generan solas", async (_, user, enBanco) => {
    useAuth.mockReturnValue({ user });
    mockFetch(enBanco);
    renderLista("publicacion");
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText(BOTON)).not.toBeInTheDocument();
  });
});
