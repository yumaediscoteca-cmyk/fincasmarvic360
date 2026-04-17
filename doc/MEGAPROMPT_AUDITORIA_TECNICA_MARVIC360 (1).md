# 🔍 MEGAPROMPT: AUDITORÍA TÉCNICA COMPLETA - MARVIC 360
## Objetivo: Identificar bloqueos, crashes y dysfunción antes de prueba piloto en campo

**Contexto:** Pedro (JuanPe) es director técnico de Grupo MARVIC. App React+TS+Supabase móvil-first en APK, servida desde servidor Ubuntu. Problema actual: **UI cuelga ("Cargando...") indefinidamente cuando navega o ejecuta acciones**, y solo se recupera limpiando cache/localStorage.

---

## FASE 1: AUDITORÍA DE ARQUITECTURA Y ESTADO GLOBAL

### 1.1 - Mapeo completo de estado global y context
```bash
# En Cursor, ejecuta:
grep -r "useContext\|createContext\|useState\|useReducer" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx" \
  | grep -E "(Context|Provider|Store|Manager)" \
  | sort | uniq

# Luego, localiza TODOS los Providers en el árbol de componentes:
find /home/juan/Desktop/fincasmarvic360/src -name "*.tsx" -o -name "*.ts" | xargs grep -l "Provider\|<.*Context"
```

**Busca:** ¿Hay múltiples contextos? ¿Cuál es el orden de envolvimiento? ¿Alguno depende de otro?

---

### 1.2 - Inspección de App.tsx o componente raíz
```bash
cat /home/juan/Desktop/fincasmarvic360/src/App.tsx
cat /home/juan/Desktop/fincasmarvic360/src/main.tsx
```

**Preguntas a responder:**
- ¿Qué providers envuelven la app? ¿En qué orden?
- ¿Hay un ErrorBoundary? ¿Dónde?
- ¿Hay un Router (React Router / TanStack Router)? ¿Cómo está configurado?
- ¿Hay listeners globales (beforeunload, popstate, etc.)?

---

## FASE 2: AUDITORÍA DE RUTAS Y NAVEGACIÓN

### 2.1 - Estructura de rutas
```bash
find /home/juan/Desktop/fincasmarvic360/src -name "*Route*" -o -name "*Router*" \
  | head -20

# Localiza la configuración del router:
grep -r "createBrowserRouter\|BrowserRouter\|Routes\|Route" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" --include="*.ts" \
  | head -30
```

**Busca:** ¿Hay una única fuente de verdad para rutas o múltiples routers anidados?

### 2.2 - Inspección de navegación y goBack
```bash
grep -r "useNavigate\|navigate\|goBack\|<Navigate\|history\|location" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" \
  | grep -v node_modules \
  | wc -l

echo "---"

# Especialmente, busca patrones problemáticos de goBack o navegación atrás:
grep -r "goBack\|-1\|replace.*history\|window.history" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" --include="*.ts"
```

**Busca:** ¿Hay llamadas a `navigate(-1)` sin validación? ¿Hay rutas que no limpian estado antes de navegar?

---

## FASE 3: AUDITORÍA DE HOOKS Y EFECTOS

### 3.1 - Inspección de useEffect en toda la app
```bash
grep -r "useEffect" /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" \
  | wc -l

echo "---"
echo "useEffect sin dependencias (posible loop infinito):"
grep -r "useEffect.*\[\s*\]" /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx"

echo "---"
echo "useEffect con dependencias pero sin limpieza:"
grep -A 3 "useEffect" /home/juan/Desktop/fincasmarvic360/src/hooks/*.ts* \
  | grep -B 3 "return" | head -40
```

**Busca:**
- ¿Hay efectos sin array de dependencias?
- ¿Hay efectos que subscriben a listeners sin limpiar (setInterval, setListeners, subscriptions)?
- ¿Hay efectos que disparan múltiples veces causando requeries?

### 3.2 - Inspección de React Query (react-query / @tanstack/react-query)
```bash
grep -r "useQuery\|useMutation\|useInfiniteQuery\|refetch" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" --include="*.ts" \
  | head -50

echo "---"
echo "Configuración de React Query (QueryClient):"
find /home/juan/Desktop/fincasmarvic360/src -name "*query*" -o -name "*Query*" \
  | grep -i config
```

**Busca:**
- ¿Hay queries que refetchOnWindowFocus sin validación?
- ¿Hay queries en estado loading infinito?
- ¿Hay stale time muy corto causando requeries innecesarias?

### 3.3 - Inspección de custom hooks (usePersonal, useParte, etc.)
```bash
ls -lah /home/juan/Desktop/fincasmarvic360/src/hooks/

echo "---"
echo "Contenido de hooks principales:"
for file in /home/juan/Desktop/fincasmarvic360/src/hooks/use*.ts*; do
  echo "=== $(basename $file) ==="
  head -50 "$file"
  echo ""
done
```

**Busca:**
- ¿Hay useEffect que disparan refetch sin depedencias correctas?
- ¿Hay estados que no se limpian al desmontar?
- ¿Hay subscriptions a Supabase sin unsubscribe?

---

## FASE 4: AUDITORÍA DE SUPABASE Y QUERIES

### 4.1 - Conexión y autenticación
```bash
echo "=== Inicialización de Supabase ==="
grep -r "createClient\|supabase\s*=" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx" \
  | head -10

echo "---"
echo "¿Hay múltiples instancias de Supabase?"
grep -r "new SupabaseClient\|createClient" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx"
```

**Busca:** ¿Hay una única instancia de supabase cliente o múltiples?

### 4.2 - Realtime subscriptions
```bash
echo "=== Realtime Subscriptions ==="
grep -r "\.on\(\|\.subscribe\(\|REALTIME\|subscription" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx"

echo "---"
echo "¿Se limpian las subscripciones?"
grep -r "\.unsubscribe\|removeListener\|off\(\|cleanup" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx"
```

**Busca:** ¿Hay subscriptions a cambios en Supabase que no se cierran? Esto causa memory leaks y requeries infinitas.

### 4.3 - Queries SQL y RLS
```bash
echo "=== Todas las queries a Supabase ==="
grep -r "\.from(\|\.select\(\|\.insert\(\|\.update\(\|\.delete\(" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx" \
  | head -100

echo "---"
echo "¿Hay errores de RLS siendo ignorados?"
grep -r "error.*RLS\|error.*permission\|\.catch\|try.*catch" \
  /home/juan/Desktop/fincasmarvic360/src/hooks \
  --include="*.ts"
```

**Busca:** ¿Hay queries que fallan silenciosamente por RLS? ¿El usuario sabe qué falló?

### 4.4 - Estados de carga y error
```bash
echo "=== Estados de loading/error sin manejo ==="
grep -r "loading\|error\|isLoading\|isPending" \
  /home/juan/Desktop/fincasmarvic360/src/pages \
  --include="*.tsx" \
  | wc -l

echo "---"
echo "¿Hay componentes que renderizan 'Cargando...' sin timeout?"
grep -r "Cargando\|Loading\|loading" \
  /home/juan/Desktop/fincasmarvic360/src/pages \
  --include="*.tsx" \
  | grep -v timeout | head -20
```

**Busca:** ¿Hay un estado "cargando indefinidamente"? ¿Hay timeout que lo recupere?

---

## FASE 5: AUDITORÍA DE COMPONENTES Y UI

### 5.1 - Componentes con estado colgado (el problema del "Cargando...")
```bash
echo "=== Componentes en /pages ==="
ls -la /home/juan/Desktop/fincasmarvic360/src/pages/

echo "---"
echo "¿Qué hacen los componentes más complejos?"
for file in /home/juan/Desktop/fincasmarvic360/src/pages/Personal.tsx \
            /home/juan/Desktop/fincasmarvic360/src/pages/ParteDiario.tsx \
            /home/juan/Desktop/fincasmarvic360/src/pages/Inventario.tsx; do
  if [ -f "$file" ]; then
    echo "=== $(basename $file) ==="
    wc -l "$file"
    echo "Estados declarados:"
    grep "useState\|useContext\|useQuery" "$file" | head -15
    echo ""
  fi
done
```

**Busca:**
- Componentes muy grandes (>500 líneas) → posible estado fragmentado
- Múltiples useState que debería ser un useReducer
- useQuery sin manejo explícito de error/timeout

### 5.2 - Componentes que navegan atrás
```bash
echo "=== Componentes con goBack o navigate(-1) ==="
grep -r "navigate.*-1\|goBack\|<back\|backButton" \
  /home/juan/Desktop/fincasmarvic360/src/pages \
  --include="*.tsx" \
  -B 2 -A 2
```

**Busca:** Cuando presionas "Atrás", ¿se limpia estado? ¿Se cancela la query en curso?

### 5.3 - Modal y overlay state leaks
```bash
echo "=== Modales y overlays ==="
grep -r "isOpen\|Modal\|Dialog\|Sheet\|Drawer" \
  /home/juan/Desktop/fincasmarvic360/src/pages \
  --include="*.tsx" \
  | grep useState | head -20
```

**Busca:** ¿Hay modales que quedan abiertos al navegar atrás? ¿Se cierran al desmontar?

---

## FASE 6: AUDITORÍA DE MEMORIA Y PERFORMANCE

### 6.1 - Memory leaks potenciales
```bash
echo "=== Event listeners sin cleanup ==="
grep -r "addEventListener\|\.on\(\|setInterval\|setTimeout" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" --include="*.ts" \
  | grep -v "// cleanup\|removeEventListener\|clearInterval\|clearTimeout"

echo "---"
echo "¿Se usan useCallback / useMemo?"
grep -r "useCallback\|useMemo" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" | wc -l
```

**Busca:** Fugas de memoria → subscriptions no cerradas, timers sin limpiar, listeners no removidos.

### 6.2 - Infinite loops en renders
```bash
echo "=== Posibles infinite render loops ==="
grep -r "setInterval\|setImmediate\|requestAnimationFrame" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" \
  | grep -v cleanup
```

---

## FASE 7: AUDITORÍA DE GESTIÓN DE CACHÉ Y ESTADO PERSISTENTE

### 7.1 - localStorage / sessionStorage
```bash
echo "=== Uso de localStorage ==="
grep -r "localStorage\|sessionStorage" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx"

echo "---"
echo "¿Se limpia en logout?"
grep -r "logout\|clearStorage\|removeItem" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx"
```

**Busca:** ¿Hay datos stale en localStorage causando comportamientos incorrectos?

### 7.2 - React Query caché
```bash
echo "=== Configuración de caché en React Query ==="
grep -r "staleTime\|cacheTime\|gcTime" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx" \
  | head -20
```

**Busca:** ¿Es el staleTime muy pequeño causando requeries?

---

## FASE 8: AUDITORÍA DE ERROR HANDLING

### 8.1 - Manejo de errores global
```bash
echo "=== ErrorBoundary ==="
grep -r "ErrorBoundary\|error.tsx\|error\.tsx" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx"

echo "---"
echo "¿Hay try/catch sin log?"
grep -r "catch.*=>\|catch.*{\|\.catch" \
  /home/juan/Desktop/fincasmarvic360/src/hooks \
  --include="*.ts" \
  | head -20
```

**Busca:** ¿Los errores se loguean? ¿El usuario ve mensajes útiles o solo "cargando"?

### 8.2 - Timeouts y recuperación
```bash
echo "=== Timeouts explícitos ==="
grep -r "timeout\|setTimeout\|AbortController" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx"
```

**Busca:** ¿Hay timeout que recupere el "cargando indefinido"?

---

## FASE 9: AUDITORÍA DE TIPOS Y COMPILACIÓN

### 9.1 - Errores de TypeScript
```bash
cd /home/juan/Desktop/fincasmarvic360
npm run type-check 2>&1 | head -50
# o
npx tsc --noEmit 2>&1 | head -50
```

**Busca:** ¿Hay any types? ¿Type mismatches silenciosamente solucionados?

### 9.2 - Tipos de Supabase
```bash
echo "=== ¿Existe database.types.ts generado? ==="
ls -la src/types/database*.ts 2>/dev/null || echo "NO ENCONTRADO"

echo "---"
echo "¿Hay tipos de tablas hardcodeados?"
grep -r "interface.*Personal\|interface.*Parte\|interface.*Inventario" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" | head -20
```

**Busca:** ¿Los tipos de Supabase están sincronizados con la BD real o son manuales?

---

## FASE 10: AUDITORÍA DE FLUJOS CRÍTICOS

### 10.1 - Flujo: Login
```bash
echo "=== Flujo de Login/Auth ==="
find /home/juan/Desktop/fincasmarvic360/src -name "*auth*" -o -name "*login*" -o -name "*Login*"

echo "---"
echo "¿Qué pasa después del login? (context setup, queries iniciales, redirección)"
grep -r "signIn\|login\|Auth.*Provider" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.tsx" \
  -A 10 | head -50
```

### 10.2 - Flujo: Guardar Personal
```bash
echo "=== Flujo de guardar Personal ==="
grep -r "savePersonal\|createPersonal\|updatePersonal\|mutation.*insert" \
  /home/juan/Desktop/fincasmarvic360/src \
  --include="*.ts" --include="*.tsx" \
  -A 15 | head -80
```

### 10.3 - Flujo: Navegar atrás desde Formulario sin guardar
```bash
echo "=== ¿Qué pasa al presionar atrás en un formulario?"
grep -r "onBack\|goBack\|navigate.*-1" \
  /home/juan/Desktop/fincasmarvic360/src/pages \
  --include="*.tsx" \
  -B 10 -A 5 | head -60
```

**Crítico:** ¿Se cancela la query en curso? ¿Se limpian los estados?

---

## FASE 11: EJECUCIÓN DE TESTS Y VALIDACIÓN

```bash
cd /home/juan/Desktop/fincasmarvic360

echo "=== ¿Hay tests? ==="
find . -name "*.test.ts*" -o -name "*.spec.ts*" | wc -l

echo "---"
echo "Build actual:"
npm run build 2>&1 | tail -30

echo "---"
echo "¿Hay warnings en build?"
npm run build 2>&1 | grep -i "warning\|error"
```

---

## FASE 12: AUDITORÍA DE RED Y SUPABASE EN VIVO

```bash
echo "=== Estado actual de Supabase ==="
echo "Tabla personal (esquema actual):"
# (debe coincidir con el de la auditoría anterior)

echo "---"
echo "¿Hay RLS que bloqueen al usuario logueado?"
echo "SELECT * FROM auth.users WHERE email = '[tu email]';"

echo "---"
echo "¿Las políticas RLS en personal permiten SELECT/INSERT/UPDATE?"
echo "SELECT * FROM pg_policies WHERE tablename = 'personal';"
```

---

## FASE 13: REPRODUCCIÓN DEL BUG

**Pasos exactos a documentar:**

1. Abre la app en el móvil
2. Inicia sesión
3. Navega a Personal
4. Intenta editar o crear un personal
5. Presiona Atrás sin guardar
6. **Observa:** ¿Se queda en "Cargando..."?
7. Abre DevTools (F12 en navegador o Inspect en móvil)
8. Ve a Application → Storage → Local Storage y toma screenshot
9. Abre Console y busca errores en rojo

**Captura:**
- Error exacto en consola
- Red tab: ¿qué requests fallan?
- Performance: ¿qué toma 10+ segundos?

---

## ENTREGABLES ESPERADOS

Después de ejecutar esta auditoría, Cursor debe proporcionar:

1. **Reporte de arquitectura:** Diagrama de contextos, providers, flujo de estado
2. **Lista de bloqueos detectados:** Cada uno con ubicación exacta en código
3. **Reporte de memory leaks:** Listeners/subscriptions no cerradas
4. **Reporte de infinite loops:** useEffect problemáticos
5. **Reporte de RLS:** ¿Qué queries fallan por permiso?
6. **Reporte de performance:** Componentes lentos, queries lentas
7. **Fixes propuestos:** Con código listo para copiar-pegar
8. **Plan de prueba:** Pasos para validar cada fix en la app real

---

## SIGUIENTE PASO DESPUÉS DE AUDITORÍA

1. **Ejecuta esta auditoría completa en Cursor**
2. **Documenta cada hallazgo**
3. **Aplica los fixes (mayores primero: memory leaks, infinite loops, RLS)**
4. **Reinicia la app y prueba los flujos críticos**
5. **Entonces: prueba piloto en campo sin riesgos**

---

**Prompt para Cursor:**
```
Eres un auditor técnico de aplicaciones React/TypeScript/Supabase de nivel enterprise. 
Tu tarea: ejecuta TODA la auditoría anterior contra el proyecto en /home/juan/Desktop/fincasmarvic360.

Para CADA fase:
1. Ejecuta los comandos bash propuestos
2. Analiza los resultados
3. Identifica problemas (loops, memory leaks, RLS blocks, timeouts infinitos)
4. Propón fixes específicos con código listo para aplicar

Enfoque especial en: ¿POR QUÉ la UI se queda en "Cargando..."? 
Busca: subscriptions sin cleanup, useEffect sin dependencias, queries sin timeout, RLS que bloquea.

Entrega un reporte ejecutivo con:
- Top 5 bloqueos críticos
- Código de cada fix
- Pasos para validar
```
