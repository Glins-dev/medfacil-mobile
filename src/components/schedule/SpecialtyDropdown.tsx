import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button, Modal, NoticeCard } from "@/components";
import type { Specialty } from "@/services/catalog.service";

export interface SpecialtyDropdownProps {
  specialties: Specialty[];
  selectedSpecialty: Specialty | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onSelect: (specialty: Specialty) => void;
  disabled?: boolean;
}

function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

// Seletor dropdown acessivel de especialidades com modal nativo em lista.
export function SpecialtyDropdown({
  specialties,
  selectedSpecialty,
  loading = false,
  error = false,
  onRetry,
  onSelect,
  disabled = false,
}: SpecialtyDropdownProps) {
  const [open, setOpen] = useState(false);

  const labelText = selectedSpecialty
    ? selectedSpecialty.name
    : loading
      ? "Carregando especialidades..."
      : "Selecione uma especialidade";

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink">Especialidade</Text>

      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          selectedSpecialty
            ? `Especialidade selecionada: ${selectedSpecialty.name}. Toque para alterar`
            : "Selecionar especialidade"
        }
        accessibilityState={{ expanded: open, disabled }}
        className={`min-h-[52px] flex-row items-center justify-between gap-3 rounded-2xl border-2 bg-white px-4 py-3 active:opacity-85 ${
          selectedSpecialty ? "border-brand" : "border-line"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className={`text-base font-semibold ${
              selectedSpecialty ? "text-ink" : "text-muted"
            }`}
          >
            {labelText}
          </Text>
          {selectedSpecialty?.description ? (
            <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">
              {selectedSpecialty.description}
            </Text>
          ) : null}
        </View>

        <ChevronDownIcon color={selectedSpecialty ? "#0e706f" : "#5f6b6f"} />
      </Pressable>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Escolha a especialidade"
        closeLabel="Fechar lista de especialidades"
      >
        <ScrollView
          className="max-h-[420px]"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-2.5 pb-2"
        >
          {loading ? (
            <View className="min-h-[120px] items-center justify-center gap-3 rounded-2xl border border-line bg-brand-cream p-6">
              <ActivityIndicator size="small" color="#0e706f" />
              <Text className="text-sm text-muted">
                Carregando especialidades...
              </Text>
            </View>
          ) : null}

          {!loading && error ? (
            <View className="gap-3 rounded-2xl border border-line bg-brand-cream p-4">
              <Text className="text-sm font-medium text-ink">
                Não foi possível carregar as especialidades.
              </Text>
              {onRetry ? (
                <Button
                  label="Tentar novamente"
                  variant="outline"
                  onPress={onRetry}
                />
              ) : null}
            </View>
          ) : null}

          {!loading && !error && specialties.length === 0 ? (
            <NoticeCard
              title="Nenhuma especialidade disponível"
              subtitle="Não há especialidades com atendimento ativo no momento."
            />
          ) : null}

          {!loading && !error && specialties.length > 0
            ? specialties.map((specialty) => {
                const isSelected = specialty.id === selectedSpecialty?.id;
                return (
                  <Pressable
                    key={specialty.id}
                    onPress={() => {
                      onSelect(specialty);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      specialty.description
                        ? `${specialty.name}. ${specialty.description}`
                        : specialty.name
                    }
                    accessibilityState={{ selected: isSelected }}
                    className={`min-h-[52px] flex-row items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 active:opacity-85 ${
                      isSelected
                        ? "border-brand bg-brand/10"
                        : "border-line bg-white"
                    }`}
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-bold text-ink">
                        {specialty.name}
                      </Text>
                      {specialty.description ? (
                        <Text className="mt-0.5 text-xs text-muted">
                          {specialty.description}
                        </Text>
                      ) : null}
                    </View>

                    {isSelected ? <CheckIcon /> : null}
                  </Pressable>
                );
              })
            : null}
        </ScrollView>
      </Modal>
    </View>
  );
}
