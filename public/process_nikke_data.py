#!/usr/bin/env python3
"""
Script para procesar y consolidar datos de personajes de NIKKE
Combina CharacterTable.json, CharacterSkillTable.json y CharacterStatTable.json
para crear un archivo completo con todos los datos de personajes.
"""

import json
import sys
from pathlib import Path

def load_json_file(filename):
    """Carga un archivo JSON y retorna su contenido"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: No se encontró el archivo {filename}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error al decodificar JSON en {filename}: {e}")
        return None

def get_visible_base_characters(character_table):
    """
    Extrae solo los personajes base visibles (sin duplicados de grados)
    """
    characters = {}
    for char in character_table.get('records', []):
        # Solo tomar personajes visibles
        if not char.get('is_visible', False):
            continue
            
        resource_id = char.get('resource_id')
        grade_core_id = char.get('grade_core_id', 1)
        
        # Solo tomar el grado base (grade_core_id = 1) para evitar duplicados
        if grade_core_id == 1:
            characters[resource_id] = char
    
    return characters

def create_character_lookup_tables(skill_table, stat_table):
    """Crea tablas de búsqueda para skills y stats indexadas por ID"""
    skills_by_id = {}
    if skill_table and 'records' in skill_table:
        for skill in skill_table['records']:
            skill_id = skill.get('id')
            if skill_id:
                skills_by_id[skill_id] = skill
    
    stats_by_id = {}
    if stat_table and 'records' in stat_table:
        for stat in stat_table['records']:
            stat_id = stat.get('id')
            if stat_id:
                stats_by_id[stat_id] = stat
    
    return skills_by_id, stats_by_id

def get_element_name(element_id_list):
    """Convierte element_id a nombre legible"""
    element_map = {
        100001: "Electric",
        200001: "Fire", 
        300001: "Water",
        400001: "Wind",
        500001: "Iron"
    }
    
    if element_id_list and len(element_id_list) > 0:
        return element_map.get(element_id_list[0], "Unknown")
    return "Unknown"

def format_character_data(char, skills_by_id, stats_by_id):
    """
    Formatea los datos del personaje en la estructura esperada por la aplicación
    """
    character_id = char.get('id')
    resource_id = char.get('resource_id')
    
    # Buscar estadísticas del personaje
    char_stats = stats_by_id.get(character_id, {})
    
    # Buscar habilidades
    skill1_id = char.get('skill1_id')
    skill2_id = char.get('skill2_id') 
    ulti_skill_id = char.get('ulti_skill_id')
    
    skill1 = skills_by_id.get(skill1_id, {})
    skill2 = skills_by_id.get(skill2_id, {})
    ulti_skill = skills_by_id.get(ulti_skill_id, {})
    
    # Construir el objeto del personaje
    formatted_char = {
        "id": resource_id,
        "name": char.get('name_localkey', f"Character_{resource_id}"),
        "rarity": char.get('original_rare', 'Unknown'),
        "element": get_element_name(char.get('element_id', [])),
        "class": char.get('class', 'Unknown'),
        "corporation": char.get('corporation', 'Unknown'),
        "squad": char.get('squad', 'Unknown'),
        "burst_cd": char.get('use_burst_skill', 'Unknown'),
        "weapon_type": "Unknown",  # No disponible en los datos actuales
        
        # Estadísticas básicas
        "hp": char_stats.get('hp', 0),
        "atk": char_stats.get('atk', 0), 
        "def": char_stats.get('def', 0),
        "critical_rate": char.get('critical_ratio', 0) / 100,  # Convertir a porcentaje
        "critical_damage": char.get('critical_damage', 0) / 100,
        
        # Rangos de cobertura
        "coverage_range_min": char.get('bonusrange_min', 0),
        "coverage_range_max": char.get('bonusrange_max', 0),
        
        # Habilidades (solo nombres/IDs por ahora)
        "skill1": {
            "id": skill1_id,
            "name": skill1.get('name', f"Skill_{skill1_id}"),
            "description": skill1.get('description', 'No description available')
        },
        "skill2": {
            "id": skill2_id,
            "name": skill2.get('name', f"Skill_{skill2_id}"),
            "description": skill2.get('description', 'No description available')
        },
        "burst_skill": {
            "id": ulti_skill_id,
            "name": ulti_skill.get('name', f"Burst_{ulti_skill_id}"),
            "description": ulti_skill.get('description', 'No description available'),
            "cooldown": char.get('burst_duration', 0)
        },
        
        # Metadatos adicionales
        "order": char.get('order', 0),
        "piece_id": char.get('piece_id', 0),
        "cv": char.get('cv_localkey', ''),
        "prism_active": char.get('prism_is_active', False)
    }
    
    return formatted_char

def main():
    print("🔥 Procesando datos completos de personajes NIKKE...")
    
    # Cargar archivos JSON
    print("📂 Cargando archivos de datos...")
    character_table = load_json_file('CharacterTable.json')
    skill_table = load_json_file('CharacterSkillTable.json')
    stat_table = load_json_file('CharacterStatTable.json')
    
    if not character_table:
        print("❌ Error: No se pudo cargar CharacterTable.json")
        return 1
    
    print("✅ Archivos cargados exitosamente")
    
    # Crear tablas de búsqueda
    print("🔍 Creando índices de habilidades y estadísticas...")
    skills_by_id, stats_by_id = create_character_lookup_tables(skill_table, stat_table)
    
    # Obtener personajes base únicos
    print("👥 Extrayendo personajes únicos...")
    base_characters = get_visible_base_characters(character_table)
    
    print(f"📊 Encontrados {len(base_characters)} personajes únicos")
    
    # Formatear datos de personajes
    print("🎨 Formateando datos de personajes...")
    formatted_characters = []
    
    for resource_id, char in base_characters.items():
        try:
            formatted_char = format_character_data(char, skills_by_id, stats_by_id)
            formatted_characters.append(formatted_char)
        except Exception as e:
            print(f"⚠️  Error procesando personaje {resource_id}: {e}")
            continue
    
    # Ordenar por orden (order) o por ID si no hay orden
    formatted_characters.sort(key=lambda x: (x.get('order', 999999), x.get('id', 0)))
    
    # Crear estructura de salida
    output_data = {
        "version": "1.0.0",
        "source": "NIKKE Official Game Data",
        "generated_at": "2024-12-27",
        "total_characters": len(formatted_characters),
        "characters": formatted_characters
    }
    
    # Guardar archivo de salida
    output_file = Path('data/nikke-characters-complete.json')
    output_file.parent.mkdir(exist_ok=True)
    
    print(f"💾 Guardando {len(formatted_characters)} personajes en {output_file}...")
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print("✅ ¡Datos guardados exitosamente!")
        print(f"📁 Archivo creado: {output_file}")
        print(f"📈 Total de personajes procesados: {len(formatted_characters)}")
        
        # Mostrar estadísticas por rareza
        rarity_stats = {}
        for char in formatted_characters:
            rarity = char.get('rarity', 'Unknown')
            rarity_stats[rarity] = rarity_stats.get(rarity, 0) + 1
        
        print("\n📊 Estadísticas por rareza:")
        for rarity, count in sorted(rarity_stats.items()):
            print(f"  {rarity}: {count} personajes")
            
        return 0
        
    except Exception as e:
        print(f"❌ Error al guardar archivo: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())